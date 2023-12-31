function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}
function randBit()       { return randomInt(0, 1) }
function randomChoice(a) { return a[randomInt(0, a.length-1)] }

const MIN_TIME=15, MAX_TIME=72
const SPEEDUP=1

class Sprite {
    constructor(o) {
        const defaults = {
            x: 0,
            y: 0,
            height: 16,
            width: 16,
            image: "spritesheet.png",
        }
        for (let key in defaults) this[key] = o[key] || defaults[key]
        const image = this.image
        this.image = new Image()
        this.image.src = image
    }
    draw(ctx, pos) {
        const SCALE = ctx.scaling || 1.0
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height,
                      pos.x*SCALE, pos.y*SCALE, this.width*SCALE, this.height*SCALE);
    }
}

class Game {
    constructor() {
        this.selectedPick = 0
        this.timeLeft = 0
        this.tumblersUnlocked = 0
        this.lock = []
        this.picture = LOCKS[0] // Picture of lock/chest
        this.text = "" // Text displayed in the little black box
        this.picks = [
            [ 9,17,0], // Left, right, broken
            [ 6,16,0],
            [10,14,0],
            [17, 7,0],
            [ 3, 1,0],
            [13,15,0],
            [10, 5,0],
            [ 8, 4,0],
            [11, 0,0],
            [12, 2,0],
        ]
        this.kbQueue = []
    }
    start() {
        this.bind()
        this.display()
        this.play()
        this.display()
    }
    sleep(seconds) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.timeLeft -= seconds * SPEEDUP
                resolve()
            }, seconds * 1000 / SPEEDUP)
        })
    }
    sound(name) {
        const audio = new Audio(`audio/${name}.wav`);
        audio.play()
    }
    async play() {
        var endSprites = []
        for (var i=0; i<8; i++) {
            endSprites.push(await this.playLock(i))
        }
        this.displayEnd(endSprites)
    }
    async playLock(i) {
        // Randomize lock
        const numTumblers = randomInt(3, 8)
        this.tumblersUnlocked = 0
        this.lock = []
        var lastTum = -1;
        for (var t=0; t<numTumblers; t++) {
            var tum = lastTum;
            while (tum == lastTum) tum = randomInt(0, 15);
            this.lock.push(lastTum = tum)
        }

        // Randomize time
        this.timeLeft = randomInt(MIN_TIME, MAX_TIME)

        // Pictures go in order
        this.picture = LOCKS[i]
        var hurry = false
        this.text = "white: Hurry up and pick the lock!"

        // Play the lock
        while (true) {
            if (this.timeLeft <= 0) {
                this.text = "red: You have failed to pick the lock!"
                this.sound("lock_fail")
                this.display()
                await this.sleep(2)
                return this.picture
            } else if (!hurry && this.timeLeft <= 8) {
                hurry = true
                this.text = "white: Hurry, time is running out!"
            }

            // Wait for keyboard input or time elapsed
            const input = await this.getInput(0.1)
            switch (input) {
                case undefined: // No input
                    break;;
                case 'ArrowUp': case 'w':
                    this.selectedPick = [9,7,8,0,1,2,3,4,5,6][this.selectedPick]
                    this.sound("pick_select")
                    break
                case 'ArrowLeft': case 'a':
                    this.selectedPick = [0,3,1,2,6,4,5,9,7,8][this.selectedPick]
                    this.sound("pick_select")
                    break
                case 'ArrowRight': case 'd':
                    this.selectedPick = [0,2,3,1,5,6,4,8,9,7][this.selectedPick]
                    this.sound("pick_select")
                    break
                case 'ArrowDown': case 's':
                    this.selectedPick = [3,4,5,6,7,8,9,1,2,0][this.selectedPick]
                    this.sound("pick_select")
                    break
                case ' ': // Flip the pick
                    this.picks[this.selectedPick] = [
                        this.picks[this.selectedPick][1],
                        this.picks[this.selectedPick][0],
                        this.picks[this.selectedPick][2]
                    ]
                    break;;
                case 'Enter': // Use the pick
                    if (this.picks[this.selectedPick][2]) {
                        this.text = "white: You can't use that pick, it's broken!"
                    } else {
                        const snapped = await this.tryPick(this.picks[this.selectedPick][1])
                        if (snapped) this.picks[this.selectedPick][2] = 1
                    }
                    break;;
                case 'Escape':
                    this.text = "red: You gave up on the lock!"
                    this.sound("lock_fail")
                    this.display()
                    await this.sleep(2)
                    return this.picture
                default:
                    break;;
            }
            this.display()

            // Finished the lock
            if (this.tumblersUnlocked >= this.lock.length) {
                await this.sleep(0.3)
                this.sound("lock_success")
                this.picture = randomChoice(CHESTS)
                this.text = "limegreen: You cleverly avoided a dart trap!"
                this.display()
                await this.sleep(2)
                return this.picture
            }
        }

    }
    async tryPick(pick) {
        const ti = this.tumblersUnlocked
        const tv = this.lock[ti]
        const x = 176 + ti*14
        const ctx = this.ctx

        // TODO: Stuck tumblers
        // red: This tumbler seems to be jammed!

        async function animateFail() {
            SPRITES["tumbler_background_1"].draw(ctx, { x: x, y: 8 })
            SPRITES[`pick_right_${pick}`].draw(ctx, { x: x, y: 30 })
            SPRITES[`lock_unpicked_${tv}`].draw(ctx, { x: x, y: 41 })
            await this.sleep(0.1)
            SPRITES["tumbler_background_2"].draw(ctx, { x: x, y: 8 })
            SPRITES[`lock_unpicked_${tv}`].draw(ctx, { x: x, y: 37 })
            await this.sleep(0.1)
            SPRITES["tumbler_background_3"].draw(ctx, { x: x, y: 8 })
            SPRITES[`lock_unpicked_${tv}`].draw(ctx, { x: x, y: 33 })
            await this.sleep(0.1)
        }
        async function animateSuccess() {
            SPRITES["tumbler_background_3"].draw(ctx, { x: x, y: 8 })
            SPRITES[`lock_picked_${tv}`].draw(ctx, { x: x, y: 28 })
            await this.sleep(.1)
            SPRITES["tumbler_background_2"].draw(ctx, { x: x, y: 8 })
            SPRITES[`lock_picked_${tv}`].draw(ctx, { x: x, y: 32 })
            await this.sleep(.05)
            SPRITES["tumbler_background_1"].draw(ctx, { x: x, y: 8 })
            SPRITES[`lock_picked_${tv}`].draw(ctx, { x: x, y: 36 })
            await this.sleep(.05)
        }
        animateFail = animateFail.bind(this)
        animateSuccess = animateSuccess.bind(this)

        if (pick == tv) { // Correct pick
            this.tumblersUnlocked++
            this.sound("tumbler_pick")
            await animateSuccess()
        } else if (randBit()) {
            this.text = "red: Be careful! You'll break the pick!"
            this.sound("tumbler_warn")
            await animateFail()
        } else {
            this.text = "red: Uh oh! You snapped that pick!"
            this.sound("tumbler_break")
            await animateFail()
            return 1
        }
    }
    async getInput(timeoutSeconds) {
        // Wait for a keystroke
        if (this.kbQueue.length > 0) {
            return this.kbQueue.shift()
        } else {
            await this.sleep(timeoutSeconds)
        }
    }
    
    displayEnd(endSprites) {
        const size = { width: 320, height: 200 }
        
        this._rectDraw(0, 0, size.width, size.height,"#f5f") // Magenta background
        this._rectDraw(7,23,117,33,"#000") // Dialogue box
        this.textDraw("Your final score was:", "limegreen")

        endSprites.forEach((sprite, i) => {
            const row = Math.floor(i / 4)
            const col = i % 4
            sprite.draw(this.ctx, {
                x: 7 + col * sprite.width,
                y: 62 + row * sprite.height,
            })
        })
    }
    bind() {
        window.addEventListener("resize", this.display.bind(this))
        document.addEventListener("keydown", this.keyPress.bind(this))
    }
    keyPress(e) {
        if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return
        switch (e.key) {
            case 'ArrowUp': case 'w':
            case 'ArrowLeft': case 'a':
            case 'ArrowRight': case 'd':
            case 'ArrowDown': case 's':
            case ' ':
            case 'Enter':
            case 'Escape':
                this.kbQueue.push(e.key)
                break
            default:
                //console.log(`Unknown key: ${e.key}`)
        }
    }
    _rectDraw(x, y, w, h, color) {
        const ctx = this.ctx
        ctx.beginPath()
        ctx.fillStyle = color
        ctx.fillRect(x*ctx.scaling,y*ctx.scaling,w*ctx.scaling,h*ctx.scaling)
    }
    _textDraw(text, pos, maxWidth, color) {
        const ctx = this.ctx
        ctx.fillStyle = color
        if (color == "white") ctx.font = "24px monospace"
        else                  ctx.font = "bold 24px monospace"
        ctx.fillText(text,pos.x*ctx.scaling,pos.y*ctx.scaling,maxWidth*ctx.scaling)
    }
    textDraw(text, color) {
        var lines = []
        var line = ""
        for (var word of text.split(" ")) {
            if (line.length + word.length + 1 > 14) {
                lines.push(line)
                line = ""
            }
            if (line) line += " "
            line = line + word
        }
        if (line) lines.push(line)

        lines.forEach((line, lineNum) => {
            this._textDraw(line, {x: 10, y: 32 + 10*lineNum}, 117, color)
        })
    }
    display() {
        const canvas = document.getElementById("play-area")
        const ctx = this.ctx = canvas.getContext("2d")
        const size = { width: 320, height: 200 }

        // Set the size of the canvas to match the screen
        canvas.width = document.documentElement.clientWidth
        canvas.height = document.documentElement.clientHeight
        // The "Virtual" screen is always 320x200
        const xStretch = canvas.width / size.width
        const yStretch = canvas.height / size.height
        const stretch = Math.min(xStretch, yStretch)
        ctx.scaling = stretch // hint to sprite.draw
        //ctx.scale(stretch, stretch)

        // Clear the screen (magenta background)
        this._rectDraw(0, 0, size.width, size.height,"#f5f") // Magenta background
        this._rectDraw(7,23,117,33,"#000") // Dialogue box
        if (this.text) {
            const [color, text] = this.text.split(": ")
            this.textDraw(text, color)
        }

        // Draw the scroll
        SPRITES.scroll.draw(ctx, {x: 1, y: 91})
        // Draw the picks on the scroll
        function drawPick(pos, pick) {
            SPRITES[`pick_left_${pick.left}`].draw(ctx, {
                x: pos.x,      y: pos.y })
            SPRITES[`pick_middle_${pick.middle}`].draw(ctx, {
                x: pos.x + 14, y: pos.y })
            SPRITES[`pick_right_${pick.right}`].draw(ctx, {
                x: pos.x + 59, y: pos.y+2 })
        }
        this.picks.forEach((pick, i) => {
            const [left, right, broken] = pick;
            const selected = (this.selectedPick == i)
            const middle = selected ? "selected" : (broken ? "broken" : "whole")
            const row = Math.floor((i + 2) / 3)
            const col = (i + 2) % 3
            const x = 24 + col * 96
            const y = 112 + row * 16
            drawPick({x,y}, {left, middle, right})

        });

        // Draw the selected pick
        const selectedPick = this.picks[this.selectedPick]
        drawPick({x: 24, y:64}, { 
            left: selectedPick[0],
            right: selectedPick[1],
            middle: selectedPick[2] ? "broken" : "whole",
        })

        // Draw the fuse (timer)
        function drawTimer(percent) {
            SPRITES["wick"].draw(ctx, {x: 7, y: 10})
            const fuseX = 7 + SPRITES["wick"].width * percent
            this._rectDraw(fuseX, 10, SPRITES["wick"].width + 7 - fuseX, 5, "#f5f") // Magenta background
            SPRITES["wick_flame"].draw(ctx, {x: fuseX, y: 10})
        }
        drawTimer.bind(this)(this.timeLeft / MAX_TIME)

        // Draw the lock icon / chest icon
        if (this.picture) this.picture.draw(ctx, {x: 129, y: 8})
        
        // Draw the lock tumblers
        this.lock.forEach((lock, i) => {
            const unlocked = this.tumblersUnlocked > i
            const x = 176 + i*14
            var sprite;
            if (unlocked) {
                SPRITES["tumbler_background_1"].draw(ctx, { x: x, y: 8 })
                SPRITES[`lock_picked_${lock}`].draw(ctx, { x: x, y: 36 })
            } else {
                SPRITES["tumbler_background_3"].draw(ctx, { x: x, y: 8 })
                SPRITES[`lock_unpicked_${lock}`].draw(ctx, { x: x, y: 33})
            }
        })
        SPRITES["tumbler_background_0"].draw(ctx, { x: 176 + this.lock.length*14, y: 8 })
    }
}

/* Load the sprites */

SPRITES={}
LOCKS = []
CHESTS = []

for (var i=0; i<18; i++) {
    SPRITES["pick_left_" + i] = new Sprite({
        x: 16*i, y: 1,  height: 12, width: 15, })
    SPRITES["pick_right_" + i] = new Sprite({
        x: 16*i, y: 19, height: 12, width: 15, })
    SPRITES["lock_unpicked_" + i] = new Sprite({
        x: 16*i, y: 32, height: 11, width: 15, })
    SPRITES["lock_picked_" + i] = new Sprite({
        x: 16*i, y: 44, height: 16, width: 15, })
}

SPRITES["pick_middle_selected"] = new Sprite({
    x: 0, y: 62, height: 14, width: 46, })
SPRITES["pick_middle_broken"] = new Sprite({
    x: 48, y: 62, height: 14, width: 46, })
SPRITES["pick_middle_whole"] = new Sprite({
    x: 96, y: 62, height: 14, width: 46, })

for (var i=0; i<4; i++) {
    SPRITES["tumbler_background_" + i] = new Sprite({
        x: 16*i, y: 77, height: 63, width: 15, })
}
for (var i=0; i<3; i++) {
    SPRITES["chest_" + i] = new Sprite({
        x: 48*i, y: 141, height: 63, width: 47, })
    CHESTS.push(SPRITES["chest_" + i])
}
for (var i=0; i<8; i++) {
    SPRITES["lock_" + i] = new Sprite({
        x: 48*i, y: 205, height: 63, width: 47, })
    LOCKS.push(SPRITES["lock_" + i])
}
SPRITES["scroll"] = new Sprite({
    x: 1, y: 269, height: 102, width: 318, })
SPRITES["wick"] = new Sprite({
    x: 0, y: 374, height: 4, width: 108, })
SPRITES["wick_flame"] = new Sprite({
    x: 108, y: 374, height: 4, width: 2, })

/* Load the game */

window.addEventListener("load", (ev) => {
    // Load the game
    game = new Game()
    game.start()
});
