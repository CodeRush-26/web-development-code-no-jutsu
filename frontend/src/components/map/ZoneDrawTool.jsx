import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { emit } from '../../lib/socket';

export default function ZoneDrawTool({ active }) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

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
      const name = window.prompt('Zone name?', 'Restricted Zone') || 'Restricted Zone';
      emit('zone:create', { name, geometry: { type: 'Polygon', coordinates: [coords] } });
      drawer.disable();
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      drawer.disable();
      map.off(L.Draw.Event.CREATED, onCreated);
      map.removeLayer(drawnItems);
    };
  }, [active, map]);

  return null;
}
