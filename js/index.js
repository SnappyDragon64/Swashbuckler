window.onload = async function () {
  let defaultData
  await fetch('data/data.json').then(response => {
    if (response.ok)
      return response.json()
  }).then(data => {
    defaultData = data
  })
  console.log(defaultData)

  let zombieData = localStorage.getItem('data')
  let levelData

  if (zombieData == null) {
    zombieData = defaultData
  }


  document.getElementById('dataJson').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      zombieData = e.target.result
      localStorage.setItem('data', zombieData.toString())

      if (levelData != null) {
        convert()
      }
    };

    reader.onerror = function () {
      zombieData = defaultData
    };

    reader.readAsText(file);
  })

  document.getElementById('levelJson').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      levelData = e.target.result
      convert()
    };

    reader.readAsText(file);
  })

  function convert() {
    let zombieDictionary = JSON.parse(zombieData)
    let levelDictionary = JSON.parse(levelData)
    let almanacOrder = Object.keys(zombieDictionary)

    let waveData = []
    let waveManagerProps = getObjectByClass(levelDictionary, 'WaveManagerProperties')
    let rawWaveData = getObjData(waveManagerProps, 'Waves')
    rawWaveData.forEach(function (rawWave) {
      let dataZombies = []

      rawWave.forEach(function (rawWaveRTID) {
        let waveID = extractRTID(rawWaveRTID)
        let waveObject = getObjectByAlias(levelDictionary, waveID)
        let objClass = waveObject['objclass']

        if (objClass === 'SpawnZombiesJitteredWaveActionProps') {
          let waveZombies = getObjData(waveObject, 'Zombies')
          if (waveZombies != null) {
            waveZombies.forEach(function (waveZombie) {
              let row = waveZombie['Row']
              let type = extractRTID(waveZombie['Type'])
              let formattedWaveZombie = {
                'type': type,
                'row': row == null ? 999 : row
              }
              dataZombies.push(formattedWaveZombie)
            })
          }
        }
      })

      dataZombies.sort((a, b) => {
        const aTypeIndex = almanacOrder.indexOf(a['type'])
        const bTypeIndex = almanacOrder.indexOf(b['type'])

        if (aTypeIndex < bTypeIndex) {
          return -1
        } else if (aTypeIndex > bTypeIndex) {
          return 1
        } else {
          return a['row'] - b['row']
        }
      })
      let wave = {
        'zombie': dataZombies
      }
      waveData.push(wave)
    })

    fillTemplate(waveData, zombieDictionary)
  }

  function getObjectByClass(json, className) {
    let objects = json['objects']
    let filtered = objects.filter(object => object['objclass'] === className)
    return filtered[0]
  }

  function getObjectByAlias(json, alias) {
    let objects = json['objects']
    let filtered = objects.filter(object => (object['aliases'] ?? [null])[0] === alias)
    return filtered[0]
  }

  function getObjData(obj, field) {
    let objData = obj['objdata']
    return objData[field]
  }

  function extractRTID(RTID) {
    return RTID.replace('RTID(', '').split('@')[0]
  }

  function fillTemplate(waveData, zombieDictionary) {
    let template = '{{Waves'

    waveData.forEach(function (wave, i) {
      let fill = fillZombie(wave['zombie'], zombieDictionary)
      template += '<br>|zombie' + (i + 1) + ' = ' + fill
    })

    template += '<br>}}'
    console.log(template)
    document.getElementById('waves').innerHTML = template
    generateZombieList(template, zombieDictionary)
  }

  function fillZombie(dataZombies, zombieDictionary) {
    if (dataZombies.length) {
      let formatted = ''

      dataZombies.forEach(function (dataZombie) {
        let formattedZombie = '{{S|'
        let rawZombieType = dataZombie['type']
        let row = dataZombie['row']
        let zombieType = zombieDictionary[rawZombieType] ?? rawZombieType

        if (typeof zombieType == "string") {
          formattedZombie += zombieType + '}}'
        } else {
          formattedZombie += zombieType['name'] + '}}' + zombieType['special']
        }

        if (row !== 999) {
          formattedZombie += '&lt;sup&gt;' + row + '&lt;/sup&gt;'
        }

        formatted += formattedZombie + ' '
      })

      return formatted
    } else {
      return 'None'
    }
  }

  function generateZombieList(template, zombieDictionary) {
    let almanacOrder = Object.values(zombieDictionary)
    let rawZombieList = template.split(/(?![^{]*}})\s+/).filter(str => str.startsWith("{{S"));
    let zombieList = []
    rawZombieList.forEach(function (rawZombie) {
      rawZombie = rawZombie.replace('{{S|', '')
      let zombie = rawZombie.split('}}')[0]
      zombieList.push(zombie)
    })
    zombieList = [...new Set(zombieList)]

    zombieList = zombieList.sort((a, b) => {
      const getIndex = (item) => {
        let result = almanacOrder.filter(a => (a['name'] ?? a) === item)
        if (result.length) {
          return almanacOrder.indexOf(result[0])
        }

        return -1;
      };

      return getIndex(a) - getIndex(b);
    })
    document.getElementById('zombies').innerText = zombieList.join(', ')
  }
}
