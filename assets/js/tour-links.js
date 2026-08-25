(() => {
  const MOBILE_WAYPOINT_LIMIT = 3;
  const URL_LENGTH_LIMIT = 2048;

  const cleanPoint = (value) => String(value || '').trim();

  const buildGoogleMapsUrl = (route) => {
    const origin = cleanPoint(route?.origin);
    const destination = cleanPoint(route?.destination);
    const returnPoint = cleanPoint(route?.returnPoint);
    const waypoints = Array.isArray(route?.waypoints)
      ? route.waypoints.map(cleanPoint).filter(Boolean)
      : [];

    if (!origin || !destination) throw new Error('invalid-route');

    const hasReturn = Boolean(returnPoint);
    const finalDestination = hasReturn ? returnPoint : destination;
    const requestedWaypoints = hasReturn
      ? [...waypoints, destination]
      : [...waypoints];

    let includedWaypoints;
    if (requestedWaypoints.length <= MOBILE_WAYPOINT_LIMIT) {
      includedWaypoints = [...requestedWaypoints];
    } else if (hasReturn) {
      includedWaypoints = [
        ...waypoints.slice(0, MOBILE_WAYPOINT_LIMIT - 1),
        destination
      ];
    } else {
      includedWaypoints = waypoints.slice(0, MOBILE_WAYPOINT_LIMIT);
    }

    let omittedCount = requestedWaypoints.length - includedWaypoints.length;

    const createUrl = () => {
      const params = new URLSearchParams({
        api: '1',
        origin,
        destination: finalDestination,
        travelmode: 'driving'
      });
      if (includedWaypoints.length) {
        params.set('waypoints', includedWaypoints.join('|'));
      }
      return `https://www.google.com/maps/dir/?${params.toString()}`;
    };

    let url = createUrl();
    const protectedWaypointCount = hasReturn ? 1 : 0;

    while (url.length > URL_LENGTH_LIMIT && includedWaypoints.length > protectedWaypointCount) {
      const removeIndex = hasReturn
        ? includedWaypoints.length - 2
        : includedWaypoints.length - 1;
      includedWaypoints.splice(Math.max(removeIndex, 0), 1);
      omittedCount += 1;
      url = createUrl();
    }

    return {
      url,
      omittedCount,
      includedWaypoints: [...includedWaypoints],
      overLengthLimit: url.length > URL_LENGTH_LIMIT
    };
  };

  window.RideLinkTourLinks = Object.freeze({
    buildGoogleMapsUrl,
    mobileWaypointLimit: MOBILE_WAYPOINT_LIMIT
  });
})();