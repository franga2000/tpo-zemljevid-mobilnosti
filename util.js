function noop(strings, ...exp) {
    const lastIndex = strings.length - 1;
  
    if (!lastIndex) return strings[0];
    let acc = "",
      part;
  
    for (let i = 0; i < lastIndex; i++) {
      part = strings[i];
      if (part) acc += part;
      acc += exp[i];
    }
    part = strings[lastIndex];
    return part ? (acc += part) : acc;
}
html = noop;

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

function geojson_convert(list, field_map) {
    let features = [];
    for (let item of list) {
        features.push({
            "type":"Feature",
            "geometry":{"coordinates":[item[field_map.lng],item[field_map.lat]],"type":"Point"},
            "properties":item,
            "id":item[field_map.id],
            "bbox":null
        })
    }
    return {"type":"FeatureCollection","features": features};
}
