import { forwardRef } from 'react';
import type { MarkerShape } from './types';

interface MarkerIconProps {
  shape: MarkerShape;
  color: string;
  size?: number;
  className?: string;
  iconUrl?: string | null;
}

export const MarkerIcon = forwardRef<SVGSVGElement | HTMLImageElement, MarkerIconProps>(
  function MarkerIcon({ shape, color, size = 24, className = '', iconUrl }, ref) {
    // Custom uploaded icon
    if (shape === 'custom' && iconUrl) {
      return (
        <img
          ref={ref as React.Ref<HTMLImageElement>}
          src={iconUrl}
          alt="Custom marker"
          width={size}
          height={size}
          className={`object-contain ${className}`}
          draggable={false}
          style={{ width: size, height: size }}
        />
      );
    }

    const halfSize = size / 2;
    
    const getPath = () => {
      switch (shape) {
        case 'circle':
          return <circle cx={halfSize} cy={halfSize} r={halfSize - 2} fill={color} stroke="hsl(var(--border))" strokeWidth="1" />;
        case 'square':
          return <rect x={2} y={2} width={size - 4} height={size - 4} fill={color} stroke="hsl(var(--border))" strokeWidth="1" />;
        case 'triangle':
          return <polygon points={`${halfSize},2 ${size - 2},${size - 2} 2,${size - 2}`} fill={color} stroke="hsl(var(--border))" strokeWidth="1" />;
        case 'diamond':
          return <polygon points={`${halfSize},2 ${size - 2},${halfSize} ${halfSize},${size - 2} 2,${halfSize}`} fill={color} stroke="hsl(var(--border))" strokeWidth="1" />;
        case 'star':
          // 5-point star
          const outerR = halfSize - 2;
          const innerR = outerR * 0.4;
          const points = [];
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i * 36 - 90) * (Math.PI / 180);
            points.push(`${halfSize + r * Math.cos(angle)},${halfSize + r * Math.sin(angle)}`);
          }
          return <polygon points={points.join(' ')} fill={color} stroke="hsl(var(--border))" strokeWidth="1" />;
        default:
          return <circle cx={halfSize} cy={halfSize} r={halfSize - 2} fill={color} stroke="hsl(var(--border))" strokeWidth="1" />;
      }
    };

    return (
      <svg ref={ref as React.Ref<SVGSVGElement>} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
        {getPath()}
      </svg>
    );
  }
);

MarkerIcon.displayName = "MarkerIcon";
