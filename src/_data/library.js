// The full player library, assembled at build time:
// the four launch meditations plus the signup gift track, which the player
// only reveals once a visitor has joined the list (giftOnly).
import { readFile } from "node:fs/promises";

export default async function () {
  const meditations = JSON.parse(
    await readFile(new URL("./meditations.json", import.meta.url), "utf8")
  );
  return [
    ...meditations.tracks,
    { ...meditations.gift, giftOnly: true }
  ];
}
