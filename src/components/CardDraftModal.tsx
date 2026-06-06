import React, { useState } from 'react';
import { playSfx } from '../audio/sfx';

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

const cardDescription = (card: string): string => {
  if (card.startsWith('ADD_')) {
    const val = card.split('_')[1];
    return `Adds +${val} damage to laser bullets that pass through this cell.`;
  }
  if (card.startsWith('SUB_')) {
    const val = card.split('_')[1];
    return `Subtracts -${val} from the health of alien asteroids that pass through this cell.`;
  }
  if (card.startsWith('MUL_')) {
    const val = card.split('_')[1];
    return `Multiplies the damage of laser bullets that pass through this cell by ${val}x.`;
  }
  if (card.startsWith('DIV_')) {
    const val = card.split('_')[1];
    return `Divides the health of alien asteroids that pass through this cell by ${val}.`;
  }
  if (card === 'FRAC_HALF') {
    return "Cuts the health of alien asteroids that pass through this cell in half (divides by 2).";
  }
  if (card.startsWith('FRAC')) {
    return "Divides/reduces the health of alien asteroids that pass through this cell.";
  }
  return `Modifies grid cell values for laser bullets or alien asteroids.`;
};

const getCardFamily = (card: string): { label: string; color: string } => {
  if (card.startsWith('ADD_')) return { label: 'ADD BULLET DAMAGE', color: '#00ffff' };
  if (card.startsWith('SUB_')) return { label: 'CHIP ASTEROID HEALTH', color: '#ff3b5c' };
  if (card.startsWith('MUL_')) return { label: 'MULTIPLY BULLET DAMAGE', color: '#b829ff' };
  if (card.startsWith('DIV_')) return { label: 'DIVIDE ASTEROID HEALTH', color: '#ff9800' };
  if (card.startsWith('FRAC') || card === 'FRAC_HALF') return { label: 'FRACTION ASTEROID HEALTH', color: '#10b981' };
  return { label: 'GRID MODIFIER', color: '#94a3b8' };
};

const CardDraftModal: React.FC<CardDraftModalProps> = ({ options, onSelect }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black/80 flex flex-col justify-center items-center z-50 p-4">
      <h2 className="glow-text mb-8 text-[#00ffff] text-3xl md:text-4xl font-bold tracking-wide text-center">
        Draft a Modifier
      </h2>

      <div className="flex gap-5 md:gap-8 w-full justify-center px-5 flex-wrap max-w-4xl">
        {options.map((card, idx) => {
          const art = cardArt(card);
          return (
            <div
              key={idx}
              className="card-flip-in aspect-5/7 cursor-pointer transition-transform duration-200 hover:scale-110 hover:-translate-y-2"
              style={{ width: 'clamp(140px, 28vw, 180px)', animationDelay: `${idx * 120}ms` }}
              onClick={() => onSelect(card)}
              onMouseEnter={() => { playSfx('hover'); setHoveredCard(card); }}
              onMouseLeave={() => setHoveredCard(null)}
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

      {/* Description Area */}
      <div
        className="mt-10 max-w-lg w-full px-6 py-4 rounded-xl border bg-slate-950/80 backdrop-blur-md text-center transition-all duration-300 min-h-[96px] flex flex-col justify-center items-center"
        style={{
          borderColor: hoveredCard ? `${getCardFamily(hoveredCard).color}40` : 'rgba(0, 255, 255, 0.15)',
          boxShadow: hoveredCard ? `0 0 15px ${getCardFamily(hoveredCard).color}20, inset 0 0 15px ${getCardFamily(hoveredCard).color}10` : 'none'
        }}
      >
        {hoveredCard ? (
          <div className="space-y-1">
            <span
              className="text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded border"
              style={{
                color: getCardFamily(hoveredCard).color,
                borderColor: `${getCardFamily(hoveredCard).color}30`,
                backgroundColor: `${getCardFamily(hoveredCard).color}10`
              }}
            >
              {getCardFamily(hoveredCard).label}
            </span>
            <p className="text-slate-100 text-sm sm:text-base font-semibold leading-relaxed mt-1">
              {cardDescription(hoveredCard)}
            </p>
          </div>
        ) : (
          <p className="text-slate-400 italic text-sm sm:text-base tracking-wide">
            Hover a card to learn what it does.
          </p>
        )}
      </div>
    </div>
  );
};

export default CardDraftModal;
