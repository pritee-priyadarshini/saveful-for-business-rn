export const OSM_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
  />
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""
  />
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    crossorigin=""
  ></script>
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }
    .leaflet-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var DEFAULT_LAT = 20.2961;
    var DEFAULT_LNG = 85.8245;
    var DEFAULT_ZOOM = 13;

    var map = null;
    var marker = null;
    var markerGroup = null;
    var polylineLayer = null;
    var selectable = false;

    function postToRn(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function ensureMap() {
      if (map) return;

      map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
      }).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      markerGroup = L.layerGroup().addTo(map);

      map.on('click', function (event) {
        if (!selectable) return;
        setMarker(event.latlng.lat, event.latlng.lng, false);
        postToRn({
          type: 'locationSelected',
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      });

      setTimeout(function () {
        map.invalidateSize();
        postToRn({ type: 'ready' });
      }, 120);
    }

    function setMarker(lat, lng, fly) {
      ensureMap();

      if (marker) {
        markerGroup.removeLayer(marker);
      }

      marker = L.marker([lat, lng]).addTo(markerGroup);

      if (fly) {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
      } else {
        map.panTo([lat, lng]);
      }
    }

    function setMarkers(markers) {
      ensureMap();
      markerGroup.clearLayers();
      marker = null;

      if (!markers || !markers.length) return;

      var bounds = [];

      markers.forEach(function (item) {
        var m = L.marker([item.lat, item.lng]);
        markerGroup.addLayer(m);
        bounds.push([item.lat, item.lng]);
      });

      if (bounds.length === 1) {
        map.flyTo(bounds[0], 14, { duration: 0.6 });
      } else {
        map.fitBounds(bounds, { padding: [36, 36] });
      }
    }

    function setPolyline(points) {
      ensureMap();

      if (polylineLayer) {
        map.removeLayer(polylineLayer);
        polylineLayer = null;
      }

      if (!points || !points.length) return;

      var latLngs = points.map(function (item) {
        return [item.lat, item.lng];
      });

      polylineLayer = L.polyline(latLngs, {
        color: '#2F6B2F',
        weight: 4,
        opacity: 0.85,
      }).addTo(map);
    }

    window.handleRnMessage = function (message) {
      ensureMap();

      if (!message || !message.type) return;

      if (message.type === 'init') {
        selectable = !!message.selectable;
        var lat = message.lat != null ? message.lat : DEFAULT_LAT;
        var lng = message.lng != null ? message.lng : DEFAULT_LNG;
        var zoom = message.zoom != null ? message.zoom : DEFAULT_ZOOM;
        map.setView([lat, lng], zoom);
        map.invalidateSize();
        return;
      }

      if (message.type === 'setMarker') {
        setMarker(message.lat, message.lng, message.fly !== false);
        return;
      }

      if (message.type === 'setMarkers') {
        setMarkers(message.markers || []);
        return;
      }

      if (message.type === 'setPolyline') {
        setPolyline(message.points || []);
        return;
      }

      if (message.type === 'invalidate') {
        map.invalidateSize();
      }
    };

    ensureMap();
  </script>
</body>
</html>`;
