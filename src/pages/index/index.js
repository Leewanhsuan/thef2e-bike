import '../../style/main.css';
import { GetAuthorizationHeader } from '../../utils/commonApi';
import { cityList } from '../../data';

/**
 * 頁面載入處理事件
 */
window.addEventListener('load', () => {
    var mymap = L.map('map').setView([25.0107036, 121.5040648], 13);

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoic2FuZHlsZWUiLCJhIjoiY2t3MGR4d2RsMHh4ZzJvbm9wb3dzNG9pbCJ9.kpIV-p6GnIpY0QIVGl0Svg',
    }).addTo(mymap);

    // 標記 icon
    const marker = L.marker([25.0107036, 121.5040648])
        .addTo(mymap)
        .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
        .openPopup();

    // navigator web api 獲取所在位置

    testClick.addEventListener('click', () => {
        geoFindMe();
    });

    function geoFindMe() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const longitude = position.coords.longitude; // 經度
                    const latitude = position.coords.latitude; // 緯度
                    console.log(longitude);
                    console.log(latitude);

                    // 重新設定 view 的位置
                    mymap.setView([latitude, longitude], 13);
                    // 將經緯度當作參數傳給 getData 執行
                    getStationData(longitude, latitude);
                },
                // 錯誤訊息
                function(e) {
                    const msg = e.code;
                    const dd = e.message;
                    console.error(msg);
                    console.error(dd);
                }
            );
        }
    }

    // 抓取位置測試

    // function geoFindMe() {
    //     var output = document.getElementById('out');

    //     if (!navigator.geolocation) {
    //         output.innerHTML = '<p>Geolocation is not supported by your browser</p>';
    //         return;
    //     }

    //     function success(position) {
    //         var latitude = position.coords.latitude;
    //         var longitude = position.coords.longitude;

    //         output.innerHTML = '<p>Latitude is ' + latitude + '° <br>Longitude is ' + longitude + '°</p>';

    //         var img = new Image();
    //         img.src =
    //             'http://maps.googleapis.com/maps/api/staticmap?center=' +
    //             latitude +
    //             ',' +
    //             longitude +
    //             '&zoom=13&size=300x300&sensor=false';

    //         output.appendChild(img);
    //     }

    //     function error() {
    //         output.innerHTML = 'Unable to retrieve your location';
    //     }

    //     output.innerHTML = '<p>Locating…</p>';

    //     navigator.geolocation.getCurrentPosition(success, error);
    // }

    // 串接附近的自行車租借站位資料
    let data = [];
    function getStationData(longitude, latitude) {
        axios({
            method: 'get',
            // url: 'https://ptx.transportdata.tw/MOTC/v2/Bike/Station/Kaohsiung',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bike/Station/NearBy?$spatialFilter=nearby(${latitude},${longitude},500)`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                console.log('租借站位資料', response);
                data = response.data;

                getAvailableData(longitude, latitude);
            })
            .catch(error => console.log('error', error));
    }
    // 串接附近的即時車位資料
    let filterData = [];
    function getAvailableData(longitude, latitude) {
        axios({
            method: 'get',
            // url: 'https://ptx.transportdata.tw/MOTC/v2/Bike/Availability/Kaohsiung',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bike/Availability/NearBy?$spatialFilter=nearby(${latitude},${longitude},500)`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                console.log('車位資料', response);
                const availableData = response.data;

                // 比對
                availableData.forEach(availableItem => {
                    data.forEach(stationItem => {
                        if (availableItem.StationUID === stationItem.StationUID) {
                            availableItem.StationName = stationItem.StationName;
                            availableItem.StationAddress = stationItem.StationAddress;
                            availableItem.StationPosition = stationItem.StationPosition;
                            filterData.push(availableItem);
                        }
                    });
                });
                console.log('filterData', filterData);

                setMarker();
            })
            .catch(error => console.log('error', error));
    }

    // 標記 icon
    function setMarker() {
        filterData.forEach(item => {
            // console.log(item.StationPosition.PositionLon, item.StationPosition.PositionLat)
            L.marker([item.StationPosition.PositionLat, item.StationPosition.PositionLon])
                .addTo(mymap)
                .bindPopup(
                    `<div class="card">
    <div class="card-body">
        <h5 class="card-title">${item.StationName.Zh_tw}</h5>
        <h6 class="card-subtitle mb-2 text-muted">${item.StationAddress.Zh_tw}</h6>
        <p class="card-text mb-0">可租借車數：${item.AvailableRentBikes}</p>
        <p class="card-text mt-0">可歸還車數：${item.AvailableReturnBikes}</p>
    </div>
    </div>`
                );
        });
    }

    // 選取道路的縣市
    const renderDataRecord = () => {
        const cityElement = document.getElementById('bikeCity');

        Object.values(cityList).forEach(element => {
            cityElement.innerHTML += `<option class="form-select-city" value="">${element}</option>`;
        });
    };

    renderDataRecord();

    const renderDefaultZone = () => {
        const cityElement = document.getElementById('bikeRoute');
        cityElement.innerHTML += `<option class="form-select" value="">請先選擇城市</option>`;
    };

    renderDefaultZone();

    // 抓取選取文字
    const cityElement = document.getElementById('bikeCity');
    cityElement.addEventListener('change', () => {
        const selectCityIndex = cityElement.selectedIndex;
        const cityKeys = Object.keys(cityList);
        const area = cityKeys[selectCityIndex];
        console.log(area);
        // 選取自行車的路線
        console.log(`https://ptx.transportdata.tw/MOTC/v2/Cycling/Shape/` + area + `?`);
        const areaURL = `https://ptx.transportdata.tw/MOTC/v2/Cycling/Shape/` + area + `?`;
        const bikeRoute = document.querySelector('#bikeRoute');
        function getRoutesData() {
            axios({
                method: 'get',
                url: areaURL,
                headers: GetAuthorizationHeader(),
            })
                .then(response => {
                    console.log('自行車的路線', response);
                    const routeData = response.data;

                    let str = '';
                    routeData.forEach(item => {
                        str += `<option value="${item.RouteName}">${item.RouteName}</option>`;
                    });
                    bikeRoute.innerHTML = str;

                    bikeRoute.addEventListener('change', e => {
                        const value = e.target.value;
                        // console.log(value)

                        if (myLayer) {
                            // console.log(myLayer);
                            mymap.removeLayer(myLayer);
                        }

                        routeData.forEach(item => {
                            // console.log(item)
                            if (item.RouteName === value) {
                                const geo = item.Geometry;
                                // console.log(geo)

                                // 畫線的方法
                                polyLine(geo);
                            }
                        });
                    });
                })
                .catch(error => console.log('error', error));
        }
        getRoutesData();
    });

    // 畫出自行車的路線 wicket 套件
    let myLayer = null;

    function polyLine(geo) {
        // 建立一個 wkt 的實體
        const wicket = new Wkt.Wkt();
        const geojsonFeature = wicket.read(geo).toJson();

        // 畫線的style
        const myStyle = {
            color: '#ff0000',
            weight: 5,
            opacity: 0.65,
        };
        const myLayer = L.geoJSON(geojsonFeature, {
            style: myStyle,
        }).addTo(mymap);

        myLayer.addData(geojsonFeature);
        // zoom the map to the layer
        mymap.fitBounds(myLayer.getBounds());
    }
});
