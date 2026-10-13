// Layar pembuka dalam aplikasi: torii + nama, fade-out setelah boot.
// Menjembatani splash native (Capacitor) ke konten aplikasi.
export default function Splash({ visible }: { visible: boolean }) {
  const base = import.meta.env.BASE_URL;
  return (
    <div className={'splash' + (visible ? '' : ' hidden')} aria-hidden="true">
      <img src={`${base}icons/icon-192.png`} alt="" draggable={false} />
      <div className="splash-name">KASANERU</div>
      <div className="splash-sub">重ねる</div>
    </div>
  );
}
