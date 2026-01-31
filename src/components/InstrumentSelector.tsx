interface InstrumentSelectorProps {
  current: string;
}

export default function InstrumentSelector({ current }: InstrumentSelectorProps) {
  return (
    <div className="absolute top-4 left-4 z-30 bg-gray-900/70 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-300 font-semibold">
      {current}
    </div>
  );
}
