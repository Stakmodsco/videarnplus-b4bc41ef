import { useIdleLogout } from "@/hooks/useIdleLogout";

/** Mounts the 15-minute idle auto-logout. Render once near the app root. */
export const IdleLogoutGuard = () => {
  useIdleLogout(15 * 60 * 1000);
  return null;
};
