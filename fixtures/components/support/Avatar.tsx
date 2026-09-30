interface AvatarProps {
  url: string;
  name: string;
}

export function Avatar({ url, name }: AvatarProps) {
  return <img src={url} alt={name} className="convat-avatar" />;
}
