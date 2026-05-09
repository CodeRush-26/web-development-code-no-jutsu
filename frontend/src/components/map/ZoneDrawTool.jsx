import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { emit } from '../../lib/socket';

export default function ZoneDrawTool({ active, onDone }) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    const drawer = new L.Draw.Polygon(map, {
      shapeOptions: { color: '#dc2626', weight: 2, fillOpacity: 0.2 },
      allowIntersection: false,
      showArea: false
    });
    drawer.enable();

    const onCreated = (e) => {
      const layer = e.layer;
      const latlngs = layer.getLatLngs()[0];
      const coords = latlngs.map((p) => [p.lng, p.lat]);
      coords.push(coords[0]);
      const ts = new Date();
      const defaultName = `Zone ${ts.getHours().toString().padStart(2, '0')}:${ts
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      const name = window.prompt('Zone name?', defaultName) || defaultName;
      emit('zone:create', {
        name,
        geometry: { type: 'Polygon', coordinates: [coords] }
      });
      drawer.disable();
      if (onDone) onDone();
    };

    const onCanceled = () => {
      drawer.disable();
      if (onDone) onDone();
    };

    map.on(L.Draw.Event.CREATED, onCreated);
    map.on(L.Draw.Event.DRAWSTOP, onCanceled);

    return () => {
      drawer.disable();
      map.off(L.Draw.Event.CREATED, onCreated);
      map.off(L.Draw.Event.DRAWSTOP, onCanceled);
    };
  }, [active, map, onDone]);

  return null;
}
