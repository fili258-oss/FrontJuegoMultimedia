// src/utils/GameTracker.js

export default class GameTracker {
    constructor({ modal, menu }) {
        this.modal = modal
        this.menu = menu
        this.startTime = null
        this.endTime = null
        this.finished = false
    }

    start() {
        this.startTime = Date.now()
        this._startLoop()
    }

    stop() {
        this.endTime = Date.now()
        this.finished = true
        return this.getElapsedSeconds()
    }

    getElapsedSeconds() {
        if (!this.startTime) return 0
        const end = this.finished ? this.endTime : Date.now()
        return Math.floor((end - this.startTime) / 1000)
    }

    _startLoop() {
        const update = () => {
            if (this.finished) return
            const elapsed = this.getElapsedSeconds()

            //console.log('⏱ Actualizando HUD con segundos:', elapsed)

            if (this.menu && typeof this.menu.setTimer === 'function') {
                this.menu.setTimer(elapsed)
            }

            requestAnimationFrame(update)
        }
        update()
    }

    saveTime(seconds) {
        const stored = JSON.parse(localStorage.getItem('bestTimes') || '[]')
        stored.push(seconds)
        stored.sort((a, b) => a - b)
        localStorage.setItem('bestTimes', JSON.stringify(stored.slice(0, 5)))
    }

    getBestTimes() {
        return JSON.parse(localStorage.getItem('bestTimes') || '[]')
    }

    //Modal de fin de juego
    showEndGameModal(currentTime, totalPoints = 0) {
        const best = this.getBestTimes()
        const ranking = best.map((t, i) => `#${i + 1}: ${t}s`).join('\n')

        if (!this.modal || typeof this.modal.show !== 'function') {
            console.warn('⚠️ No se puede mostrar el modal de fin: modal no definido.')
            return
        }

        this.modal.show({
            icon: '🏁',
            message: `¡Felicidades!\nTerminaste la partida.\n⏱ Tu tiempo: ${currentTime}s\n\n🪙 Monedas totales: ${totalPoints}\n\n🏆 Mejores tiempos:\n${ranking}`,
            buttons: [
                {
                    text: '🔁 Reintentar',
                    onClick: () => {
                        window.experience.resetGame()
                    }
                },
                {
                    text: '❌ Cancelar',
                    onClick: () => {
                        this.modal.hide()
                        this.showReplayButton()
                    }
                }

            ]
        })

        const cancelBtn = document.getElementById('cancel-button')
        if (cancelBtn) cancelBtn.remove()

    }

    //iniciar juego
    showReplayButton() {
        if (document.getElementById('replay-button')) return

        const btn = document.createElement('button')
        btn.id = 'replay-button'
        btn.innerText = '🎮 Volver a jugar'

        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '10px 16px',
            fontSize: '16px',
            background: '#00fff7',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            boxShadow: '0 0 12px #00fff7',
            cursor: 'pointer',
            zIndex: 9999
        })

        btn.onclick = () => {
            this.hideGameButtons()
            window.experience.resetGame()
        }

        document.body.appendChild(btn)
    }



    //Finalizar partida
    showCancelButton() {
        if (this.finished || document.getElementById('cancel-button')) return

        const btn = document.createElement('button')
        btn.id = 'cancel-button'
        btn.innerText = '✖' // Ícono simple
        btn.title = 'Cancelar juego'

        Object.assign(btn.style, {
            position: 'fixed',
            top: '16px',
            left: '16px',
            width: '44px',
            height: '44px',
            padding: '0',
            fontSize: '24px',
            lineHeight: '44px',
            textAlign: 'center',
            background: 'rgba(255, 77, 77, 0.9)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            zIndex: 9999,
            userSelect: 'none'
        })

        // Confirmación al presionar
        btn.onclick = () => {
            this.modal?.show({
                icon: '⚠️',
                message: '¿Deseas cancelar la partida en curso?\nPerderás tu progreso actual.',
                buttons: [
                    {
                        text: '❌ Cancelar juego',
                        onClick: () => {
                            this.hideGameButtons()
                            this.modal.hide()
                            window.experience.resetGame()
                        }
                    },
                    {
                        text: '↩️ Seguir jugando',
                        onClick: () => this.modal.hide()
                    }
                ]
            })
        }

        document.body.appendChild(btn)
    }


    hideGameButtons() {
        const replayBtn = document.getElementById('replay-button')
        const cancelBtn = document.getElementById('cancel-button')
        if (replayBtn) replayBtn.remove()
        if (cancelBtn) cancelBtn.remove()
    }


    destroy() {
        this.finished = true
        if (this.timerElement && this.timerElement.remove) {
            this.timerElement.remove()
            this.timerElement = null
        }
    }


}