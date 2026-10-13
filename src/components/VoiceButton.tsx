import type { CSSProperties } from 'react';

type Props = {
  onPress: () => void;
  label: string;
  /** true: melayang di pojok kanan atas kartu */
  overlay?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Tombol putar suara kecil & tidak mengganggu — satu-satunya tombol
 * suara di layar kuis. Toggle suara otomatis ada di Profile.
 */
export default function VoiceButton({ onPress, label, overlay, className, style }: Props) {
  return (
    <button
      type="button"
      className={
        'voice-btn' +
        (overlay ? ' voice-btn-overlay' : '') +
        (className ? ` ${className}` : '')
      }
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
      aria-label={label}
      title={label}
    >
      聴
    </button>
  );
}
