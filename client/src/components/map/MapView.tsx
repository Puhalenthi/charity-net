import { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, AdvancedMarker, InfoWindow, Map, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { LatLng } from '@charity-net/shared';
import { jitterLocation } from '@charity-net/shared';

export type MapPin = {
  id: string;
  position: LatLng;
  title: string;
  thumbnailUrl?: string;
  jitter?: boolean;
  jitterSeed?: string;
};

type MapViewProps = {
  center: LatLng;
  radiusKm: number;
  pins: MapPin[];
  renderPopup?: (id: string) => React.ReactNode;
  pinColor?: string;
};

export function MapView(props: MapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    return (
      <div className="grid place-items-center h-96 rounded-lg border bg-muted text-sm text-muted-foreground">
        Set VITE_GOOGLE_MAPS_KEY to enable the map.
      </div>
    );
  }
  return (
    <APIProvider apiKey={apiKey}>
      <div className="h-[60vh] w-full rounded-lg overflow-hidden border">
        <Map
          defaultCenter={props.center}
          defaultZoom={zoomForRadius(props.radiusKm)}
          mapId="charity-net"
          disableDefaultUI={false}
          gestureHandling="greedy"
        >
          <MarkerCluster pins={props.pins} renderPopup={props.renderPopup} pinColor={props.pinColor} />
        </Map>
      </div>
    </APIProvider>
  );
}

function MarkerCluster({
  pins,
  renderPopup,
  pinColor,
}: {
  pins: MapPin[];
  renderPopup?: (id: string) => React.ReactNode;
  pinColor?: string;
}) {
  const map = useMap();
  const [openId, setOpenId] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);

  const displayed = useMemo(
    () =>
      pins.map((p) => ({
        ...p,
        position: p.jitter
          ? jitterLocation(p.position, 100, p.jitterSeed ?? p.id)
          : p.position,
      })),
    [pins],
  );

  useEffect(() => {
    if (!map) return;
    if (clustererRef.current) clustererRef.current.clearMarkers();
    markersRef.current = [];

    const markers = displayed.map((p) => {
      const marker = new google.maps.Marker({
        position: p.position,
        title: p.title,
      });
      marker.addListener('click', () => setOpenId(p.id));
      return marker;
    });
    markersRef.current = markers;
    clustererRef.current = new MarkerClusterer({ map, markers });
    return () => {
      clustererRef.current?.clearMarkers();
    };
  }, [map, displayed]);

  if (!renderPopup || !openId) return null;
  const pin = displayed.find((p) => p.id === openId);
  if (!pin) return null;
  return (
    <InfoWindow position={pin.position} onCloseClick={() => setOpenId(null)}>
      <div className="map-popup min-w-[200px]">{renderPopup(openId)}</div>
    </InfoWindow>
  );
}

function zoomForRadius(radiusKm: number): number {
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 25) return 11;
  return 10;
}
