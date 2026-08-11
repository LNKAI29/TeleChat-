export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  about: string;
  avatar_url: string | null;
  cover_url: string | null;
  peer_id: string | null;
  email_verified?: boolean;
  banned?: boolean;
  verified?: boolean;
};

export const initialsOf = (p: Pick<Profile, "display_name" | "username">) =>
  (p.display_name || p.username || "?").trim().slice(0, 2).toUpperCase();
