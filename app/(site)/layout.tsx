import { MusicProvider } from "@/components/MusicButton";

/**
 * Shared by the 3D site (/) and the simple view (/simple). It stays mounted while visitors switch
 * between the two, so the music plays on without a break. Each view keeps its own styles,
 * scoped to its root (.xp and .pxxl), so the two never restyle each other.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <MusicProvider>{children}</MusicProvider>;
}
