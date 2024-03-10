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
    document.getElementById('print').textContent = 'Default zombie data loaded.'
    zombieData = defaultData
  } else {
    document.getElementById('print').textContent = 'Custom zombie data loaded.'
  }


  document.getElementById('dataJson').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      zombieData = e.target.result
      localStorage.setItem('data', zombieData.toString())

      if (levelData == null) {
        document.getElementById('print').textContent = 'Custom zombie data loaded.'
      } else {
        convert()
      }
    };

    reader.onerror = function () {
      zombieData = defaultData
      document.getElementById('print').textContent = 'Custom zombie data invalid. Default zombie data loaded.'
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

    reader.onerror = function () {
      document.getElementById('print').textContent = 'Level data invalid.'
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
      template += '<br>|zombie' + (i + 1) + ' = ' + fillZombie(wave['zombie'], zombieDictionary)
    })

    template += '<br>}}'
    console.log(template)
    document.getElementById('print').innerHTML = template
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
}
