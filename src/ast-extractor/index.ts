/**
 * ast-extractor — TDD v1.0 §3.2 / Task Breakdown CONV-103 + CONV-104
 *
 * Responsibility: find the exported component, extract its prop contract, and
 * enumerate every import statement — resolved or not — plus the raw hook calls
 * found in the component body.
 *
 * This module deliberately does NOT decide what to do about an unresolved
 * import; that decision belongs to `capability-engine` (TDD §3.3). Here an
 * import is only *described*, and `RawImport.resolvesToFile` records whether it
 * points at something real. Consequence worth knowing: for a zero-repo target
 * nothing is installed, so `react` is reported as unresolved and it is
 * `capability-engine` that treats runtime imports as satisfied by
 * externalization (errata D2) rather than stubbing React.
 *
 * Parsing is in-memory from `ResolvedTarget.code`, never by re-reading the file:
 * stdin targets have no file at all, and re-reading would let the analyzed
 * source drift from the source we were handed.
 *
 * Deliberate v1 scope (extend only with a ticket):
 *   - Prop types resolve against declarations in the SAME file only. A props
 *     interface imported from elsewhere yields no props (see errata D9).
 *   - Top-level declarations only; a component nested in another function is not
 *     detected.
 *   - `memo(...)` / `forwardRef(...)` / `connect(...)` default exports are not
 *     unwrapped, so their inner function is not seen as a component.
 *   - Parse failures surface as `NoComponentFoundError` (there is no component to
 *     extract). Bundle-level failures belong to the bundler per the TDD §4
 *     taxonomy — this module must never raise `BundleError`.
 */

import { statSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";

import { Node, Project, SyntaxKind, ts } from "ts-morph";
import type {
  ArrayTypeNode,
  ArrowFunction,
  CallExpression,
  ClassDeclaration,
  ExportAssignment,
  FunctionDeclaration,
  FunctionExpression,
  ImportDeclaration,
  InterfaceDeclaration,
  IntersectionTypeNode,
  LiteralTypeNode,
  MethodSignature,
  ParenthesizedTypeNode,
  PropertyAccessExpression,
  PropertySignature,
  SourceFile,
  StringLiteral,
  TypeAliasDeclaration,
  TypeLiteralNode,
  TypeNode,
  TypeReferenceNode,
  UnionTypeNode,
  VariableStatement,
} from "ts-morph";

import { NoComponentFoundError } from "../types/index.js";
import type {
  ComponentManifest,
  ExportType,
  PropCategory,
  PropDescriptor,
  RawImport,
  ResolvedTarget,
} from "../types/index.js";

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

/** Types that mock cleanly from their name alone (TDD §3.4 mapping table). */
const PRIMITIVE_KEYWORD_KINDS = new Set<SyntaxKind>([
  SyntaxKind.StringKeyword,
  SyntaxKind.NumberKeyword,
  SyntaxKind.BooleanKeyword,
  SyntaxKind.BigIntKeyword,
]);

/**
 * `React.FC<Props>`-style annotations: the props contract lives in the type
 * argument, not in the function's first parameter.
 */
const FUNCTION_COMPONENT_NAMES = new Set<string>([
  "FC",
  "React.FC",
  "FunctionComponent",
  "React.FunctionComponent",
  "VFC",
  "React.VFC",
]);

/** Union members that mean "optional" rather than "part of the value". */
const NULLISH_TEXT = new Set<string>(["undefined", "null"]);

/**
 * Extensions probed when a specifier does not hit a file exactly. Style and
 * asset extensions are included on purpose: whether `./x.module.scss` resolves
 * is a question `capability-engine` needs answered (errata D4).
 */
const PROBE_EXTENSIONS: readonly string[] = [
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
];

/** The single exported function of this module (TDD §3.2). */
export function extractComponent(target: ResolvedTarget): ComponentManifest {
  const source = createSourceFile(target);
  const candidate = findComponent(source);

  if (!candidate) {
    throw new NoComponentFoundError(target.filePath);
  }

  return {
    componentName: candidate.name.length > 0 ? candidate.name : "AnonymousComponent",
    exportType: candidate.exportType,
    props: propsFromTypeNode(candidate.propsType, source, new Set()),
    imports: enumerateImports(source, target),
    hookCalls: extractHookCalls(candidate.body),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Source file construction
// ─────────────────────────────────────────────────────────────────────────

/**
 * One `Project` for the whole process.
 *
 * A Project per call measured **2–4s per call** in the test suite — it stands up
 * a LanguageService and loads library definitions — which by itself would blow
 * PRD §3's <2s end-to-end budget. This shared Project with `noLib` measures
 * **~90ms cold and ~5–8ms per call** afterwards (benchmarked, not guessed).
 *
 * `noLib` is safe and load-bearing for that speed: this module only ever
 * *parses*. It never asks the language service to resolve or type-check
 * anything, so the standard library is never consulted.
 *
 * Reuse is safe because nothing here depends on project-wide state: prop types
 * resolve against declarations in the same file only, and import resolution uses
 * the target's real path rather than the project's view of it. `overwrite: true`
 * keeps same-named targets from colliding, and each call reads only the code it
 * was handed.
 */
let sharedProject: Project | undefined;

function getProject(): Project {
  sharedProject ??= new Project({
    // Never consult the user's tsconfig: the pipeline analyzes the code it was
    // handed, in isolation. That is the product premise.
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      allowJs: true,
      noLib: true,
      target: ts.ScriptTarget.ES2022,
      noEmit: true,
    },
  });

  return sharedProject;
}

function createSourceFile(target: ResolvedTarget): SourceFile {
  return getProject().createSourceFile(sourceFileName(target), target.code, {
    overwrite: true,
  });
}

/**
 * JSX only parses when the file name says so, so a stdin target is named `.tsx`.
 * A real `.ts` target keeps `.ts` — a plain utility file genuinely has no JSX,
 * and pretending otherwise would parse `<T>` generics as JSX elements and throw
 * away the clearest evidence that "no component here" is the right verdict.
 */
function sourceFileName(target: ResolvedTarget): string {
  if (!target.filePath) return "convat-stdin.tsx";
  const base = basename(target.filePath);
  return /\.(tsx|jsx|ts|js|mjs|cjs)$/.test(base) ? base : `${base}.tsx`;
}

// ─────────────────────────────────────────────────────────────────────────
// Component detection (CONV-103)
// ─────────────────────────────────────────────────────────────────────────

interface ComponentCandidate {
  name: string;
  exportType: ExportType;
  exported: boolean;
  propsType: TypeNode | undefined;
  /** Node whose descendants are searched for hook calls. */
  body: Node;
}

/**
 * Exported declarations win over unexported ones, default export wins over
 * named, and among equals the first in source order wins — so the verdict for a
 * given file is stable rather than dependent on iteration order.
 *
 * A JSX-returning body is deliberately NOT required: a component that returns a
 * string, a ternary, or another function's result is still the component the
 * user pointed us at.
 */
function findComponent(source: SourceFile): ComponentCandidate | undefined {
  const candidates: ComponentCandidate[] = [];

  for (const statement of source.getStatements()) {
    switch (statement.getKind()) {
      case SyntaxKind.FunctionDeclaration:
        collectFunction(statement as FunctionDeclaration, candidates);
        break;
      case SyntaxKind.VariableStatement:
        collectArrowComponents(statement as VariableStatement, candidates);
        break;
      case SyntaxKind.ClassDeclaration:
        collectClassComponent(statement as ClassDeclaration, candidates);
        break;
      case SyntaxKind.ExportAssignment:
        collectExportAssignment(statement as ExportAssignment, candidates);
        break;
      default:
        break;
    }
  }

  return (
    candidates.find((one) => one.exported && one.exportType === "default") ??
    candidates.find((one) => one.exported) ??
    candidates[0]
  );
}

function collectFunction(
  fn: FunctionDeclaration,
  candidates: ComponentCandidate[]
): void {
  const name = fn.getName() ?? "";
  const exported = exportTypeOf(fn);

  // An anonymous `export default function () {}` is assumed to be a component;
  // an unexported anonymous function cannot be reached by the user at all.
  if (!isComponentName(name) && exported !== "default") return;

  candidates.push({
    name,
    exportType: exported ?? "named",
    exported: exported !== undefined,
    propsType: functionPropsType(fn),
    body: fn,
  });
}

function collectArrowComponents(
  statement: VariableStatement,
  candidates: ComponentCandidate[]
): void {
  const exported = exportTypeOf(statement);

  for (const declaration of statement.getDeclarations()) {
    const name = declaration.getName();
    if (!isComponentName(name)) continue;

    const initializer = declaration.getInitializer();
    if (!initializer) continue;

    const initializerKind = initializer.getKind();
    if (
      initializerKind !== SyntaxKind.ArrowFunction &&
      initializerKind !== SyntaxKind.FunctionExpression
    ) {
      continue;
    }

    candidates.push({
      name,
      exportType: exported ?? "named",
      exported: exported !== undefined,
      propsType: functionPropsType(
        initializer as ArrowFunction | FunctionExpression,
        declaration.getTypeNode()
      ),
      body: initializer,
    });
  }
}

function collectClassComponent(
  cls: ClassDeclaration,
  candidates: ComponentCandidate[]
): void {
  const name = cls.getName() ?? "";
  if (!isComponentName(name)) return;
  if (!containsJsx(cls)) return;

  const exported = exportTypeOf(cls);

  candidates.push({
    name,
    exportType: exported ?? "named",
    exported: exported !== undefined,
    propsType: classPropsType(cls),
    body: cls,
  });
}

/** `export default Identifier;` and anonymous `export default () => <div />;`. */
function collectExportAssignment(
  statement: ExportAssignment,
  candidates: ComponentCandidate[]
): void {
  const expression = statement.getExpression();
  const expressionKind = expression.getKind();

  if (expressionKind === SyntaxKind.Identifier) {
    const named = candidates.find(
      (candidate) => candidate.name === expression.getText()
    );
    if (named) {
      candidates.push({ ...named, exportType: "default", exported: true });
    }
    return;
  }

  if (
    expressionKind === SyntaxKind.ArrowFunction ||
    expressionKind === SyntaxKind.FunctionExpression
  ) {
    candidates.push({
      name: "",
      exportType: "default",
      exported: true,
      propsType: functionPropsType(
        expression as ArrowFunction | FunctionExpression
      ),
      body: expression,
    });
  }
}

/** A component name is PascalCase (or `_Foo`, which a minifier keeps). */
function isComponentName(name: string): boolean {
  return /^_?[A-Z]/.test(name);
}

/**
 * Export type of a top-level statement, or `undefined` when it isn't exported.
 *
 * Uses ts-morph's `isDefaultExport()` / `isExported()` rather than scanning
 * `getChildren()`: modifiers do NOT appear as direct children — `export default`
 * sits inside the leading `SyntaxList` (verified with a probe) — so a structural
 * scan silently reports every default export as unexported, which would make
 * every `export default function Foo()` fixture look like a named export.
 */
function exportTypeOf(
  statement: FunctionDeclaration | ClassDeclaration | VariableStatement
): ExportType | undefined {
  if (statement.isDefaultExport()) return "default";
  if (statement.isExported()) return "named";
  return undefined;
}

/**
 * The props type of a component function: an `FC<Props>` annotation on the
 * variable or the return type, else the first parameter's own annotation.
 * `undefined` means "this component declares no props" — never a guess.
 */
function functionPropsType(
  fn: FunctionDeclaration | ArrowFunction | FunctionExpression,
  declaredType?: TypeNode
): TypeNode | undefined {
  const fromDeclaredType = fcTypeArgument(declaredType);
  if (fromDeclaredType) return fromDeclaredType;

  const fromReturnType = fcTypeArgument(fn.getReturnTypeNode());
  if (fromReturnType) return fromReturnType;

  const [firstParameter] = fn.getParameters();
  return firstParameter?.getTypeNode();
}

/** `FC<Props>` / `React.FunctionComponent<Props>` → the `Props` type argument. */
function fcTypeArgument(annotation: TypeNode | undefined): TypeNode | undefined {
  if (!annotation || annotation.getKind() !== SyntaxKind.TypeReference) {
    return undefined;
  }

  const reference = annotation as TypeReferenceNode;
  if (!FUNCTION_COMPONENT_NAMES.has(reference.getTypeName().getText())) {
    return undefined;
  }

  const [typeArgument] = reference.getTypeArguments();
  return typeArgument;
}

/** `class Foo extends React.Component<Props>` — props are the type argument. */
function classPropsType(cls: ClassDeclaration): TypeNode | undefined {
  const extended = cls.getExtends();
  if (!extended) return undefined;

  const [typeArgument] = extended.getTypeArguments();
  return typeArgument;
}

/** A class only counts as a component if it renders JSX somewhere. */
function containsJsx(node: Node): boolean {
  return (
    node.getFirstDescendantByKind(SyntaxKind.JsxElement) !== undefined ||
    node.getFirstDescendantByKind(SyntaxKind.JsxSelfClosingElement) !== undefined ||
    node.getFirstDescendantByKind(SyntaxKind.JsxFragment) !== undefined
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Prop contract (CONV-103)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolves a props type annotation into descriptors.
 *
 * Type declarations resolve against THIS FILE only (module header), and
 * recursion is guarded by `seen` so a self-referential or mutually recursive
 * props type terminates instead of hanging the pipeline.
 */
function propsFromTypeNode(
  typeNode: TypeNode | undefined,
  source: SourceFile,
  seen: ReadonlySet<string>
): PropDescriptor[] {
  if (!typeNode) return [];

  const functionComponentArgument = fcTypeArgument(typeNode);
  if (functionComponentArgument) {
    return propsFromTypeNode(functionComponentArgument, source, seen);
  }

  switch (typeNode.getKind()) {
    case SyntaxKind.TypeLiteral:
      return descriptorsFromMembers(
        (typeNode as TypeLiteralNode).getMembers(),
        source,
        seen
      );
    case SyntaxKind.IntersectionType:
      return (typeNode as IntersectionTypeNode)
        .getTypeNodes()
        .flatMap((part) => propsFromTypeNode(part, source, seen));
    case SyntaxKind.ParenthesizedType:
      return propsFromTypeNode(
        (typeNode as ParenthesizedTypeNode).getTypeNode(),
        source,
        seen
      );
    case SyntaxKind.TypeReference: {
      const name = (typeNode as TypeReferenceNode).getTypeName().getText();
      const declaration = findTypeDeclaration(source, name);
      if (!declaration || seen.has(name)) return [];
      return descriptorsFromDeclaration(declaration, source, withSeen(seen, name));
    }
    default:
      return [];
  }
}

function descriptorsFromDeclaration(
  declaration: InterfaceDeclaration | TypeAliasDeclaration,
  source: SourceFile,
  seen: ReadonlySet<string>
): PropDescriptor[] {
  if (declaration.getKind() === SyntaxKind.InterfaceDeclaration) {
    const iface = declaration as InterfaceDeclaration;

    const inherited = iface.getExtends().flatMap((base) => {
      const baseName = base.getExpression().getText();
      if (seen.has(baseName)) return [];
      const baseDeclaration = findTypeDeclaration(source, baseName);
      if (!baseDeclaration) return [];
      return descriptorsFromDeclaration(baseDeclaration, source, withSeen(seen, baseName));
    });

    return mergeByName(inherited, descriptorsFromMembers(iface.getMembers(), source, seen));
  }

  const aliased = (declaration as TypeAliasDeclaration).getTypeNode();
  if (!aliased) return [];

  // `type Props = { ... }` reads directly; a union, intersection or further
  // reference goes back through the resolver.
  if (aliased.getKind() === SyntaxKind.TypeLiteral) {
    return descriptorsFromMembers((aliased as TypeLiteralNode).getMembers(), source, seen);
  }

  return propsFromTypeNode(aliased, source, seen);
}

/** Interfaces and type aliases declared at the top level of this file. */
function findTypeDeclaration(
  source: SourceFile,
  name: string
): InterfaceDeclaration | TypeAliasDeclaration | undefined {
  for (const statement of source.getStatements()) {
    const kind = statement.getKind();

    if (kind === SyntaxKind.InterfaceDeclaration) {
      const iface = statement as InterfaceDeclaration;
      if (iface.getName() === name) return iface;
    } else if (kind === SyntaxKind.TypeAliasDeclaration) {
      const alias = statement as TypeAliasDeclaration;
      if (alias.getName() === name) return alias;
    }
  }

  return undefined;
}

/** On a name collision the later declaration wins, keeping the first position. */
function mergeByName(
  inherited: PropDescriptor[],
  own: PropDescriptor[]
): PropDescriptor[] {
  const byName = new Map<string, PropDescriptor>();

  for (const descriptor of inherited) byName.set(descriptor.name, descriptor);
  for (const descriptor of own) byName.set(descriptor.name, descriptor);

  return [...byName.values()];
}

function withSeen(seen: ReadonlySet<string>, name: string): ReadonlySet<string> {
  return new Set([...seen, name]);
}

/**
 * Descriptors for the members of a type literal. Method signatures are `complex`
 * on purpose: a method cannot be auto-mocked safely, so it belongs in the raw
 * JSON editor rather than behind a guessed value (Error Handling Spec §3.1).
 */
function descriptorsFromMembers(
  members: Node[],
  source: SourceFile,
  seen: ReadonlySet<string>
): PropDescriptor[] {
  const descriptors: PropDescriptor[] = [];

  for (const member of members) {
    const kind = member.getKind();

    if (kind === SyntaxKind.PropertySignature) {
      const property = member as PropertySignature;
      const typeNode = property.getTypeNode();
      const classification = categorize(typeNode, source, seen);

      descriptors.push({
        name: propertyName(property.getName()),
        tsType: typeNode?.getText() ?? "",
        category: classification.category,
        required: !property.hasQuestionToken() && !isNullishUnion(typeNode),
        ...(classification.enumValues
          ? { enumValues: classification.enumValues }
          : {}),
      });
    } else if (kind === SyntaxKind.MethodSignature) {
      const method = member as MethodSignature;

      descriptors.push({
        name: propertyName(method.getName()),
        tsType: member.getText(),
        category: "complex",
        required: !method.hasQuestionToken(),
      });
    }
  }

  return descriptors;
}

/** `{ "data-id": string }` → `data-id`, so keys match what the sidebar shows. */
function propertyName(name: string): string {
  return name.replace(/^["']|["']$/g, "");
}

interface PropClassification {
  category: PropCategory;
  enumValues?: string[];
}

/** Maps a type annotation onto the category the sidebar renders a control for. */
function categorize(
  typeNode: TypeNode | undefined,
  source: SourceFile,
  seen: ReadonlySet<string>
): PropClassification {
  if (!typeNode) return { category: "complex" };

  switch (typeNode.getKind()) {
    case SyntaxKind.UnionType:
      return categorizeUnion(typeNode as UnionTypeNode, source, seen);
    case SyntaxKind.ArrayType:
      return arrayClassification(
        (typeNode as ArrayTypeNode).getElementTypeNode(),
        source,
        seen
      );
    case SyntaxKind.TypeReference:
      return categorizeReference(typeNode as TypeReferenceNode, source, seen);
    default:
      break;
  }

  const literal = stringLiteralValue(typeNode);
  if (literal !== undefined) return { category: "enum", enumValues: [literal] };

  if (PRIMITIVE_KEYWORD_KINDS.has(typeNode.getKind())) {
    return { category: "primitive" };
  }

  // Tuples, function types, `typeof x`, and anything unrecognised: `complex` is
  // the honest answer, and it routes the prop to the JSON editor.
  return { category: "complex" };
}

/**
 * A union of string literals is an enum (`"a" | "b"`); a union of primitives is
 * a primitive; a union of objects is complex. Nullish members are stripped
 * first, so `"a" | "b" | undefined` is still an enum of two.
 */
function categorizeUnion(
  union: UnionTypeNode,
  source: SourceFile,
  seen: ReadonlySet<string>
): PropClassification {
  const members = union
    .getTypeNodes()
    .filter((part) => !NULLISH_TEXT.has(part.getText()));

  const [onlyMember] = members;
  if (!onlyMember) return { category: "complex" };
  if (members.length === 1) return categorize(onlyMember, source, seen);

  const literals = members.map(stringLiteralValue);
  if (literals.every((value): value is string => value !== undefined)) {
    return { category: "enum", enumValues: literals };
  }

  if (members.every((part) => PRIMITIVE_KEYWORD_KINDS.has(part.getKind()))) {
    return { category: "primitive" };
  }

  return { category: "complex" };
}

function categorizeReference(
  reference: TypeReferenceNode,
  source: SourceFile,
  seen: ReadonlySet<string>
): PropClassification {
  const name = reference.getTypeName().getText();
  const [firstTypeArgument] = reference.getTypeArguments();

  if ((name === "Array" || name === "ReadonlyArray") && firstTypeArgument) {
    return arrayClassification(firstTypeArgument, source, seen);
  }

  // A local alias for a primitive or an enum (`type Status = "a" | "b"`) still
  // mocks cleanly, so look through one level of indirection. Anything else
  // (a reference to another file's type, a generic) is complex — never a guess.
  const declaration = findTypeDeclaration(source, name);
  if (
    declaration &&
    !seen.has(name) &&
    declaration.getKind() === SyntaxKind.TypeAliasDeclaration
  ) {
    const aliased = (declaration as TypeAliasDeclaration).getTypeNode();
    if (aliased) {
      const inner = categorize(aliased, source, withSeen(seen, name));
      if (inner.category === "primitive" || inner.category === "enum") return inner;
    }
  }

  return { category: "complex" };
}

/**
 * `string[]` → array. `Foo[]`, `typeof bar[]`, `() => void[]` → complex: if the
 * mock generator cannot build an element, the whole prop needs the JSON editor.
 */
function arrayClassification(
  element: TypeNode,
  source: SourceFile,
  seen: ReadonlySet<string>
): PropClassification {
  const inner = categorize(element, source, seen);

  if (inner.category === "primitive" || inner.category === "enum") {
    return { category: "array" };
  }

  return { category: "complex" };
}

/** The value of a string literal type (`"active"` → `active`), else undefined. */
function stringLiteralValue(typeNode: TypeNode): string | undefined {
  if (typeNode.getKind() !== SyntaxKind.LiteralType) return undefined;

  const literal = (typeNode as LiteralTypeNode).getLiteral();
  if (literal.getKind() !== SyntaxKind.StringLiteral) return undefined;

  return (literal as StringLiteral).getLiteralValue();
}

/** `string | undefined` and `string | null` are optional, not unions. */
function isNullishUnion(typeNode: TypeNode | undefined): boolean {
  if (!typeNode || typeNode.getKind() !== SyntaxKind.UnionType) return false;

  return (typeNode as UnionTypeNode)
    .getTypeNodes()
    .some((part) => NULLISH_TEXT.has(part.getText()));
}

// ─────────────────────────────────────────────────────────────────────────
// Import enumeration (CONV-104)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Every import statement, resolved or not (TDD §3.2). `export ... from "..."` is
 * included too: it is a real dependency of the file even though nothing is bound
 * by it, and `05-missing-imports.tsx`-style breakage can hide there.
 */
function enumerateImports(source: SourceFile, target: ResolvedTarget): RawImport[] {
  const imports: RawImport[] = [];

  for (const declaration of source.getImportDeclarations()) {
    const path = declaration.getModuleSpecifierValue();
    imports.push({
      path,
      resolvesToFile: resolvesToFile(path, target),
      importedNames: importedNamesOf(declaration),
    });
  }

  for (const declaration of source.getExportDeclarations()) {
    const path = declaration.getModuleSpecifierValue();
    if (!path) continue;
    imports.push({
      path,
      resolvesToFile: resolvesToFile(path, target),
      importedNames: declaration
        .getNamedExports()
        .map((specifier) => specifier.getName()),
    });
  }

  return imports;
}

function importedNamesOf(declaration: ImportDeclaration): string[] {
  const names: string[] = [];

  const defaultImport = declaration.getDefaultImport();
  if (defaultImport) names.push(defaultImport.getText());

  const namespaceImport = declaration.getNamespaceImport();
  if (namespaceImport) names.push(namespaceImport.getText());

  for (const named of declaration.getNamedImports()) {
    names.push(named.getName());
  }

  return names;
}

/**
 * Does this specifier point at something real? Bare specifiers are probed in the
 * *previewed project's* `node_modules` — never Convat's — because the question is
 * whether the project can satisfy the import.
 *
 * `react` therefore reports `false` for a zero-repo target (nothing installed),
 * and `capability-engine` is what decides externalization satisfies runtime
 * imports anyway (errata D2).
 */
function resolvesToFile(specifier: string, target: ResolvedTarget): boolean {
  if (specifier.startsWith(".")) {
    // A stdin target has no directory to resolve against, so a relative import
    // is unresolvable by definition — the canonical pasted-component case.
    if (!target.filePath) return false;
    return probePath(join(dirname(target.filePath), specifier));
  }

  if (isAbsolute(specifier)) return probePath(specifier);

  if (!target.projectRoot) return false;
  return probeNodeModules(specifier, target.projectRoot);
}

/** Exact hit, then the extension list, then a package-style `index` file. */
function probePath(basePath: string): boolean {
  if (isFile(basePath)) return true;

  for (const extension of PROBE_EXTENSIONS) {
    if (isFile(`${basePath}${extension}`)) return true;
  }

  for (const extension of PROBE_EXTENSIONS) {
    if (isFile(join(basePath, `index${extension}`))) return true;
  }

  return false;
}

function probeNodeModules(specifier: string, projectRoot: string): boolean {
  const segments = specifier.split("/");
  const isScoped = specifier.startsWith("@");
  const packageName = isScoped ? segments.slice(0, 2).join("/") : segments[0];

  if (!packageName) return false;

  const packageDirectory = join(projectRoot, "node_modules", packageName);
  if (!isDirectory(packageDirectory)) return false;

  const subPath = isScoped
    ? segments.slice(2).join("/")
    : segments.slice(1).join("/");

  return subPath.length > 0 ? probePath(join(packageDirectory, subPath)) : true;
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Hook calls (CONV-104)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Raw hook call names found in the component body, in source order and
 * deduplicated.
 *
 * This is a *raw signal*: classification into `context` / `redux-like` provider
 * requirements belongs to `capability-engine` (TDD §3.2's note on `hookCalls`).
 *
 * `useContext(ThemeContext)` deliberately keeps its argument, because the context
 * name is what the coverage panel shows the user ("1 provider mocked
 * (ThemeContext)") and what lets a provider be matched to the hook needing it
 * (errata D9). Other hooks are captured by name only.
 */
function extractHookCalls(body: Node): string[] {
  const hooks: string[] = [];
  const seen = new Set<string>();

  for (const call of body.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    const calleeKind = callee.getKind();

    let name: string | undefined;
    if (calleeKind === SyntaxKind.Identifier) {
      name = callee.getText();
    } else if (calleeKind === SyntaxKind.PropertyAccessExpression) {
      // `React.useState()` — the hook is the property, not the namespace.
      name = (callee as PropertyAccessExpression).getName();
    }

    if (!name || !/^use[A-Z]/.test(name)) continue;

    const entry = name === "useContext" ? contextCallEntry(call) ?? name : name;
    if (seen.has(entry)) continue;

    seen.add(entry);
    hooks.push(entry);
  }

  return hooks;
}

/** `useContext(ThemeContext)` → `useContext(ThemeContext)`. */
function contextCallEntry(call: CallExpression): string | undefined {
  const [firstArgument] = call.getArguments();
  if (!firstArgument) return undefined;

  return `useContext(${firstArgument.getText()})`;
}