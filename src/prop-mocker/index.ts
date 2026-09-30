/**
 * prop-mocker — TDD v1.0 §3.4
 *
 * Responsibility: prop value generation only. Import/stub generation lives
 * in dependency-classifier + dependency-stubber, not here.
 *
 * Ticket: CONV-106
 * Status: not yet implemented
 */

import type { PropDescriptor, MockedProps } from "../types/index.js";

export function mockProps(props: PropDescriptor[]): MockedProps {
  throw new Error("prop-mocker.mockProps: not yet implemented (CONV-106)");
}
