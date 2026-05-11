export function MapBackdrop() {
  return (
    <div className="map-stage__backdrop">
      <div className="map-stage__road-h" style={{ top: '35%', left: 0, right: 0, height: 18 }} />
      <div className="map-stage__road-h" style={{ top: '60%', left: 0, right: 0, height: 14 }} />
      <div className="map-stage__road-v" style={{ left: '30%', top: 0, bottom: 0, width: 14 }} />
      <div className="map-stage__road-v" style={{ left: '65%', top: 0, bottom: 0, width: 10 }} />
      <div className="map-stage__block" style={{ top: '8%', left: '5%', width: '22%', height: '24%' }} />
      <div className="map-stage__block" style={{ top: '8%', left: '34%', width: '28%', height: '20%' }} />
      <div className="map-stage__block" style={{ top: '8%', left: '70%', width: '25%', height: '22%' }} />
      <div className="map-stage__park" style={{ top: '42%', left: '34%', width: '28%', height: '14%' }} />
      <div className="map-stage__block" style={{ top: '65%', left: '5%', width: '22%', height: '28%' }} />
      <div className="map-stage__block" style={{ top: '65%', left: '34%', width: '28%', height: '28%' }} />
      <div className="map-stage__block" style={{ top: '65%', left: '70%', width: '25%', height: '28%' }} />
    </div>
  );
}
