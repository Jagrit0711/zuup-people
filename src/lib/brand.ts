export const ZUUP_LOGO =
  "https://raw.githubusercontent.com/Jagrit0711/zuup-main/bc25cc6dafa9026827ffffa84f5d6740d86950ab/public/lovable-uploads/b44b8051-6117-4b37-999d-014c4c33dd13.png";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
