import { useActiveGame } from "../hooks/useGameState";

import { PlayerInitialsIcon } from "./PlayerInitialsIcon";

export function Presence() {
  const { gameState } = useActiveGame();
  return (
    <div className="flex w-full items-center justify-center gap-1 mt-2 p-3 bg-gray-100 border rounded-b-lg">
      <p className="text-nowrap text-xs text-gray-500">Players ready:</p>

      <div className="flex self-start w-full overflow-hidden">
        {gameState.players
          .sort((a, b) => {
            if (a.ready && !b.ready) return -1;
            if (!a.ready && b.ready) return 1;
            return 0;
          })
          .map((player, i) => (
            <div
              style={{
                transform: `translateX(-${i * 8}px)`,
                zIndex: gameState.players.length - i,
              }}
              key={player.name}
              className="flex items-center gap-2"
            >
              <PlayerInitialsIcon
                className="!w-5 !h-5 text-xs"
                showReady
                player={player}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
