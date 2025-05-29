import { Howl } from 'howler'

export default class AmbientSound {
    constructor(url) {
      this.url       = url
      this.context   = null
      this.buffer    = null
      this.source    = null
      this.isPlaying = false
  
      // Solo cargamos el buffer, NO creamos AudioContext
      fetch(this.url)
        .then(r => r.arrayBuffer())
        .then(data => {
          const AudioCtx = window.AudioContext || window.webkitAudioContext
          // creamos temporalmente para decodificar
          const tempCtx = new AudioCtx()
          return tempCtx.decodeAudioData(data).then(buf => {
            this.buffer = buf
            tempCtx.close()
          })
        })
    }
  
    // Se llama desde el botón de Audio (user gesture)
    async toggle() {
      // 1) Crear o reanudar AudioContext tras el click
      if (!this.context) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        this.context = new AudioCtx()
      }
      await this.context.resume()
  
      // 2) Iniciar/detener
      if (this.isPlaying) {
        this.source.stop()
        this.isPlaying = false
      } else {
        this.source = this.context.createBufferSource()
        this.source.buffer = this.buffer
        this.source.loop = true
        this.source.connect(this.context.destination)
        this.source.start()
        this.isPlaying = true
      }
    }
  }
  
