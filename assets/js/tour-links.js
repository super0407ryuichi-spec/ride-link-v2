(() => {
  const MAX_WAYPOINTS_PER_SEGMENT = 3;
  const MAX_POINTS_PER_SEGMENT = MAX_WAYPOINTS_PER_SEGMENT + 2;
  const URL_LENGTH_LIMIT = 2048;

  const cleanPoint = (value) => String(value || '').trim();

  const buildSegmentUrl = ({ origin, destination, waypoints }) => {
    const params = new URLSearchParams({
      api: '1',
      origin,
      destination,
      travelmode: 'driving'
    });
    if (waypoints.length) params.set('waypoints', waypoints.join('|'));
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  };

  const getRoutePoints = (route) => {
    const origin = cleanPoint(route?.origin);
    const destination = cleanPoint(route?.destination);
    const returnPoint = cleanPoint(route?.returnPoint);
    const waypoints = Array.isArray(route?.waypoints)
      ? route.waypoints.map(cleanPoint).filter(Boolean)
      : [];

    if (!origin || !destination) throw new Error('invalid-route');
    return [origin, ...waypoints, destination, ...(returnPoint ? [returnPoint] : [])];
  };

  const buildGoogleMapsSegments = (route) => {
    const points = getRoutePoints(route);
    const segments = [];
    let startIndex = 0;

    while (startIndex < points.length - 1) {
      let endIndex = Math.min(
        startIndex + MAX_POINTS_PER_SEGMENT - 1,
        points.length - 1
      );
      let segmentPoints = points.slice(startIndex, endIndex + 1);
      let segmentUrl = buildSegmentUrl({
        origin: segmentPoints[0],
        destination: segmentPoints.at(-1),
        waypoints: segmentPoints.slice(1, -1)
      });

      while (segmentUrl.length > URL_LENGTH_LIMIT && segmentPoints.length > 2) {
        endIndex -= 1;
        segmentPoints = points.slice(startIndex, endIndex + 1);
        segmentUrl = buildSegmentUrl({
          origin: segmentPoints[0],
          destination: segmentPoints.at(-1),
          waypoints: segmentPoints.slice(1, -1)
        });
      }

      segments.push({
        index: segments.length + 1,
        origin: segmentPoints[0],
        destination: segmentPoints.at(-1),
        waypoints: segmentPoints.slice(1, -1),
        url: segmentUrl,
        overLengthLimit: segmentUrl.length > URL_LENGTH_LIMIT
      });
      startIndex = endIndex;
    }

    return segments;
  };

  const buildGoogleMapsShareText = (route, segments = buildGoogleMapsSegments(route)) => {
    const title = cleanPoint(route?.title) || '名称未設定';
    const links = segments
      .map((segment) => `区間${segment.index}\n${segment.url}`)
      .join('\n\n');
    return `${title}\n\n${links}`;
  };

  const buildGoogleMapsUrl = (route) => {
    const segments = buildGoogleMapsSegments(route);
    return {
      ...segments[0],
      segments,
      segmentCount: segments.length,
      omittedCount: 0,
      includedWaypoints: [...segments[0].waypoints],
      overLengthLimit: segments.some((segment) => segment.overLengthLimit)
    };
  };

  window.RideLinkTourLinks = Object.freeze({
    buildGoogleMapsSegments,
    buildGoogleMapsShareText,
    buildGoogleMapsUrl,
    maxWaypointsPerSegment: MAX_WAYPOINTS_PER_SEGMENT,
    maxPointsPerSegment: MAX_POINTS_PER_SEGMENT
  });
})();