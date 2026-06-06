import React from 'react';

interface CardDraftModalProps {
  options: string[];
  onSelect: (card: string) => void;
}

// Map a card ID to its AI-generated card face (public/assets/cards).
// Families: ADD/SUB → cyan, MUL/DIV → magenta, FRAC → green.
const cardArt = (card: string): string | null => {
  if (card.startsWith('ADD_')) return '/assets/cards/card-add.png';
  if (card.startsWith('SUB_')) return '/assets/cards/card-sub.png';
  if (card.startsWith('MUL_')) return '/assets/cards/card-mul.png';
  if (card.startsWith('DIV_')) return '/assets/cards/card-div.png';
  if (card.startsWith('FRAC')) return '/assets/cards/card-frac-half.png';
  return null; // unknown ID — fall back to text label
};

const CardDraftModal: React.FC<CardDraftModalProps> = ({ options, onSelect }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black/80 flex flex-col justify-center items-center z-50">
      <h2 className="glow-text mb-8 text-[#00ffff] text-3xl md:text-4xl font-bold tracking-wide">
        Draft a Modifier
      </h2>

      <div className="flex gap-5 md:gap-8 w-full justify-center px-5 flex-wrap">
        {options.map((card, idx) => {
          const art = cardArt(card);
          return (
            <div
              key={idx}
              className="card-flip-in aspect-[5/7] cursor-pointer transition-transform duration-200 hover:scale-110 hover:-translate-y-2"
              style={{ width: 'clamp(140px, 28vw, 180px)', animationDelay: `${idx * 120}ms` }}
              onClick={() => onSelect(card)}
            >
              {art ? (
                <img
                  src={art}
                  alt={card}
                  draggable={false}
                  className="w-full h-full object-contain drop-shadow-[0_0_16px_rgba(192,38,255,0.5)] select-none"
                />
              ) : (
                <div className="glass-panel w-full h-full flex flex-col justify-center items-center border-2 border-[#b829ff] shadow-[0_0_14px_rgba(255,0,255,0.35)]">
                  <span className="text-3xl md:text-4xl font-bold text-[#e0f2fe] drop-shadow-[0_0_6px_white]">
                    {card}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CardDraftModal;
