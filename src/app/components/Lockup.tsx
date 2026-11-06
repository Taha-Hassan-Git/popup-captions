
export function Lockup({ size }: { size?: "small" | "large" }) {
  return (
    <div>
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          {/* <VenetianMask className={size === 'large' ? 'h-12 w-12' : 'h-7 w-7'} /> */}
        </div>
        <div className="flex flex-col">
          <h1
            className={`font-bold text-gray-800 ${size === "large" ? "text-4xl" : "text-2xl"}`}
          >
            {/* Game name goes here */}
          </h1>
        </div>
      </div>
    </div>
  );
}
