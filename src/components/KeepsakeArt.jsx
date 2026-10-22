const ink = '#5c5145';

export function KeepsakeArt({ kind, className = '' }) {
  let drawing;
  switch (kind) {
    case 'tea': drawing = <>
      <path d="m36 33 5 52q18 8 34 0l5-52" fill="#d3ac7b" />
      <path d="m38 45 3 27q18 8 35 0l2-27" fill="#f4dec1" stroke="none" />
      <path d="m65 33 7-24" stroke="#ba6b54" strokeWidth="5" />
      <ellipse cx="58" cy="33" rx="25" ry="6" fill="#fcf4e5" />
      <path d="M44 40v15" stroke="#fff5df" strokeWidth="4" />
      {[46, 55, 65, 71].map((x, i) => <circle key={x} cx={x} cy={80 - i % 2 * 5} r="3" fill={ink} stroke="none" />)}
      <path d="M50 60q6-8 10 0 4-8 10-1 0 5-10 11-10-6-10-10Z" fill="#b87361" stroke="none" />
    </>; break;
    case 'flower': drawing = <>
      <path d="m38 66 20 30 24-30Z" fill="#e9d9bb" />
      <path d="m57 83-8-48m12 44 11-45m-11 44-1-59" stroke="#7d9167" strokeWidth="3" />
      <path d="M51 66Q30 59 40 47q14 4 11 19m12-6q25-15 23 1-14 10-23-1" fill="#91a27a" stroke="none" />
      {[[43,35,'#cf8875'],[74,36,'#ddb072'],[59,23,'#e4b2a1']].map(([x,y,c])=><g key={x} transform={`translate(${x} ${y})`}>
        {[0,72,144,216,288].map(a=><ellipse key={a} cy="-7" rx="6" ry="9" transform={`rotate(${a})`} fill={c} strokeWidth="1.4" />)}
        <circle r="4" fill="#f2dba3" strokeWidth="1.4" />
      </g>)}
      <path d="m49 78 19 1m-9 0-13 8m13-8 12 9" stroke="#ac6653" strokeWidth="3" />
    </>; break;
    case 'camera': drawing = <>
      <path d="M29 36q-7-25 13-22" fill="none" stroke="#a28260" strokeWidth="4" />
      <rect x="24" y="33" width="72" height="52" rx="8" fill="#7d8d80" />
      <path d="M24 47h72v20H24" fill="#b5beb0" stroke="none" />
      <path d="m45 33 5-10h24l6 10" fill="#d5d7c9" />
      <rect x="29" y="27" width="13" height="6" rx="2" fill="#c2a77f" />
      <circle cx="61" cy="59" r="23" fill="#ede3ce" />
      <circle cx="61" cy="59" r="16" fill="#526660" />
      <circle cx="61" cy="59" r="10" fill="#8ca6a1" stroke="none" />
      <circle cx="56" cy="54" r="4" fill="#d4e1d6" stroke="none" />
      <rect x="80" y="39" width="10" height="6" rx="2" fill="#f4e6c4" strokeWidth="1" />
    </>; break;
    case 'ticket': drawing = <>
      <g transform="rotate(-12 60 55)"><path d="M22 28h76v16q-10 5 0 11v23H22V55q10-6 0-11Z" fill="#e5b3a0" />
        <path d="M75 29v49" strokeDasharray="3 4" strokeWidth="1.5" /><path d="M31 40h32m-32 8h22m-22 17h32" strokeWidth="2" />
        <path d="M81 39h10m-10 5h10m-10 5h10m-10 5h10m-10 5h10m-10 5h10" strokeWidth="1" />
        <path d="m52 54 3 5 6 1-5 3v6l-4-4-5 2 1-6-4-3 6-1Z" fill="#fff1d9" stroke="none" />
      </g>
    </>; break;
    case 'goose': drawing = <>
      <path d="M39 80q-23-14-16-33l14 7q10-3 19 2l6-26q1-16 16-16 18 0 16 16-2 10-12 11l-3 24q-6 27-40 15Z" fill="#fff8e8" />
      <path d="m92 26 14 6-15 5" fill="#d5a05f" />
      <circle cx="82" cy="25" r="2.5" fill={ink} stroke="none" />
      <path d="M42 58q-4 15 20 11" fill="none" /><path d="m47 85-4 9h-9m28-11 3 10h10" stroke="#be8750" strokeWidth="3" />
      <path d="m61 43 21 5-6 7-15-6Z" fill="#b56955" stroke="none" /><path d="m76 49 10 17-9-2-4-14" fill="#b56955" stroke="none" />
    </>; break;
    case 'orange': drawing = <>
      <path d="M62 32q-5-15 9-21" stroke="#71835d" strokeWidth="3" />
      <path d="M63 26q-31-25-30-3 14 13 30 3" fill="#9caa78" />
      <path d="M61 31c-49-14-57 54-15 62 34 11 57-13 49-40-5-18-17-25-34-22Z" fill="#dda45c" />
      <path d="M41 41q-14 8-15 22" stroke="#f2cb8b" strokeWidth="5" />
      <path d="m54 33 7 4 8-5" fill="none" />
      {[0,1,2,3,4].map((n)=><circle key={n} cx={67+n*4} cy={70+n%2*7} r="1" fill="#b47b3d" stroke="none" />)}
    </>; break;
    case 'record': drawing = <>
      <rect x="21" y="24" width="63" height="65" rx="2" fill="#b3aaaf" transform="rotate(-8 52 56)" />
      <path d="m26 68 21-30 21 29" fill="#e7d8c2" stroke="none" />
      <circle cx="70" cy="58" r="32" fill="#575755" /><circle cx="70" cy="58" r="25" fill="none" stroke="#85847d" strokeWidth="1" />
      <circle cx="70" cy="58" r="20" fill="none" stroke="#85847d" strokeWidth="1" /><circle cx="70" cy="58" r="11" fill="#d7a18a" />
      <circle cx="70" cy="58" r="2" fill="#f8ead4" stroke="none" />
    </>; break;
    case 'cake': drawing = <>
      <ellipse cx="60" cy="87" rx="41" ry="6" fill="#ddd4be" stroke="none" />
      <path d="M28 50h64v31q-32 15-64 0Z" fill="#e4b29a" />
      <path d="M29 66q31 13 62 0" stroke="#fff0d7" strokeWidth="6" />
      <path d="M27 49q2-18 32-18 31 0 35 18v12q-6 10-12-1-6 12-13 1-7 12-14 0-8 12-14-1-8 9-14 0Z" fill="#fff2dd" />
      <rect x="57" y="20" width="6" height="22" rx="1" fill="#a5b19a" />
      <path d="M60 19q-12-7 0-17 12 13 0 17" fill="#d8a059" stroke="none" />
      <circle cx="40" cy="43" r="4" fill="#b86e59" stroke="none" /><circle cx="79" cy="44" r="4" fill="#b86e59" stroke="none" />
    </>; break;
    case 'letter': drawing = <>
      <rect x="19" y="30" width="82" height="56" rx="4" fill="#ede1c6" />
      <path d="m20 82 29-26m51 26L72 56" fill="none" /><path d="m20 32 40 31 40-31" fill="#fcf1d9" />
      <circle cx="60" cy="61" r="12" fill="#ba705c" stroke="#a15b4d" />
      <path d="M53 58q3-4 7 0 4-4 7 0 1 5-7 9-8-4-7-9" fill="#e7b49d" stroke="none" />
    </>; break;
    default: drawing = <path d="m30 50 30-25 30 25v40H30Z" fill="#e3c7a3" />;
  }
  return <svg className={className} viewBox="0 0 120 110" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawing}</svg>;
}

export function MatchIcon({ name, size = 20 }) {
  const paths = {
    sound: <><path d="m11 5-6 4H2v6h3l6 4Z" /><path d="M15 8q5 4 0 8m3-11q8 7 0 14" /></>,
    mute: <><path d="m11 5-6 4H2v6h3l6 4Z" /><path d="m16 9 6 6m0-6-6 6" /></>,
    undo: <><path d="m8 4-5 5 5 5M3 9h11a7 7 0 0 1 0 14" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 1 1 4 3c-1 0-1 1-1 2m0 3h.01" /></>,
    spark: <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    close: <path d="m6 6 12 12m0-12L6 18" />,
    reset: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></>,
    heart: <path d="M12 20S2 14 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-10 12-10 12Z" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    check: <path d="m5 12 5 5L20 7" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
