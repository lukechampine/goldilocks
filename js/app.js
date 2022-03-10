import { csv } from "https://cdn.skypack.dev/d3-fetch@3";

// US map options
var options = {
  zoomSnap: .1,
  center: [39, -97],
  zoom: 4.3,
  minZoom: 2,
  zoomControl: false
  // attributionControl: false
}

// create map
var map = L.map('mapid', options);


// request tiles and add to map
var OpenStreetMap_Mapnik = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// change zoom control position
L.control.zoom({
  position: 'bottomleft'
}).addTo(map);

var hexGridLayer = L.geoJSON();

// create temperature slider
var slider = document.getElementById('slider');
noUiSlider.create(slider, {
  range: {
    min: -10,
    max: 110
  },
  step: 1,
  start: [40, 80],
  tooltips: [true, true],
  connect: true,

  // No decimals
  // TODO: widen
  format: {
    to: Math.floor,
    from: Math.floor,
  }
});


// example breaks for legend
var breaksAnnual = [0, 20, 50, 75, 100, 150, 200, 366];
var breaksMonthly = [0, 2, 5, 10, 15, 20, 25, 31];
var breaks = breaksAnnual; // default
var colorize = chroma.scale('Spectral').domain([1, 0]).classes(breaks).mode('lab');

// select time frame
var month = document.getElementById('month');
month.value = 'all';

month.addEventListener('change', function () {
  if (this.value == 'all') {
    breaks = breaksAnnual;
  } else {
    breaks = breaksMonthly;
  }
  colorize = chroma.scale('Spectral').domain([1, 0]).classes(breaks).mode('lab');
  updateMap(...slider.noUiSlider.get());
  updateLegend(breaks, colorize);
});

slider.noUiSlider.on('update', temps => updateMap(...temps));

document.querySelectorAll('input[name="mode"]').forEach((item, i) => {
  item.addEventListener('change', () => {
    updateMap(...slider.noUiSlider.get());
  })
});

// map

function drawMap() {
  hexGridLayer.addData(hexgrid).addTo(map);
  updateMap(...slider.noUiSlider.get());
}


function updateMap(sliderMin, sliderMax) {
  let mode = document.querySelector('input[name="mode"]:checked').value;
  var months = Array.from({ length: 12 }, (_v, k) => k + 1);
  hexGridLayer.eachLayer(function (layer) {
    var min, max;
    if (mode == "avg") {
      min = layer.feature.properties["avgBelow"];
      max = layer.feature.properties["avgBelow"];
    } else if (mode == "minmax") {
      min = layer.feature.properties["minBelow"];
      max = layer.feature.properties["maxBelow"];
    }
    var days = 0;
    if (month.value == "all") {
      for (var m of months) {
        days += max[m][sliderMax + 10] - min[m][sliderMin + 10];
      }
    } else {
      days = max[month.value][sliderMax + 10] - min[month.value][sliderMin + 10];
    }

    layer.feature.properties["days"] = days;
  });


  hexGridLayer.setStyle(feature => {
    let days = feature.properties["days"];
    return {
      fillColor: (days != undefined) ? colorize(days) : 'lightgrey',
      weight: 1.5,
      opacity: 1,
      color: 'grey',
      fillOpacity: 0.7
    };
  });
}

// legend

function drawLegend(breaks, colorize) {
  var legendControl = L.control({ position: 'bottomright' });
  legendControl.onAdd = () => L.DomUtil.create('div', 'legend');
  legendControl.addTo(map);

  var legendHTML = "<h3>Legend</h3> (days in temp. range)<ul>";
  for (var i = 0; i < breaks.length - 1; i++) {
    var color = colorize(breaks[i], breaks);
    var classRange = '<li><span style="background:' + color + '"></span> ' +
      breaks[i].toLocaleString() + ' &mdash; ' +
      breaks[i + 1].toLocaleString() + '</li>';
    legendHTML += classRange;
  }
  legendHTML += '</ul><p>Data from <a href="https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" target="_blank">NOAA 30-Yr Normals (1991 – 2020)</a></p>';

  document.querySelector('.legend').innerHTML = legendHTML;
}

function updateLegend(breaks, colorize) {
  let legendList = "";
  for (var i = 0; i < breaks.length - 1; i++) {
    var color = colorize(breaks[i], breaks);
    var classRange = '<li><span style="background:' + color + '"></span> ' +
      breaks[i].toLocaleString() + ' &mdash; ' +
      breaks[i + 1].toLocaleString() + '</li>';
    legendList += classRange;
  }
  document.querySelector(".legend ul").innerHTML = legendList;
}

// initial draw
drawMap();
drawLegend(breaks, colorize);
