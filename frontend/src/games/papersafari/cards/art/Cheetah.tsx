import { INK } from '../palette';

const FUR = '#f5c45a';
const FUR_DARK = '#dfa23e';

export function Cheetah() {
  const spots = [[44, 33], [50, 29], [56, 33], [37, 39], [63, 39], [28, 52], [72, 52], [30, 63], [70, 63], [36, 72], [64, 72],
    [38, 90], [50, 94], [62, 90], [30, 95], [70, 95]];
  return (
    <g>
      <ellipse cx="50" cy="92" rx="26" ry="11" fill={FUR_DARK} />
      <circle cx="29" cy="31" r="8" fill={FUR} /><circle cx="29" cy="31" r="4.5" fill={FUR_DARK} />
      <circle cx="71" cy="31" r="8" fill={FUR} /><circle cx="71" cy="31" r="4.5" fill={FUR_DARK} />
      <circle cx="50" cy="54" r="26" fill={FUR} />
      <g fill="#fffaf0">
        <circle cx="44" cy="67" r="8.5" />
        <circle cx="56" cy="67" r="8.5" />
      </g>
      <g fill={INK}>
        {spots.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.2" />)}
      </g>
      <path d="M38 52 Q35 61 41 69 M62 52 Q65 61 59 69" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="48" r="3.6" fill={INK} /><circle cx="41" cy="47" r="1" fill="#fff" />
      <circle cx="60" cy="48" r="3.6" fill={INK} /><circle cx="61" cy="47" r="1" fill="#fff" />
      <path d="M45.5 59 h9 l-4.5 5z" fill={INK} />
      <path d="M50 64 q-4 5 -7 2 M50 64 q4 5 7 2" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  );
}
