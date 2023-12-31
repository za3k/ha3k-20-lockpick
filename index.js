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
        this.lock = [0, 0, 0, 0, 0, 0, 0]
        this.animating = 0 // Freeze keyboard while animating something
        this.picture = 0 // Picture of lock/chest
        this.picks = [
            [ 9,17,0,0], // Left, right, left_broken, right_broken
            [ 6,16,0,0],
            [10,14,0,0],
            [17, 7,0,0],
            [ 3, 1,0,0],
            [13,15,0,0],
            [10, 5,0,0],
            [ 8, 4,0,0],
            [11, 0,0,0],
            [12, 2,0,0],
        ]
    }
    keyPress(e) {

    }
    display() {
        const canvas = document.getElementById("play-area")
        const ctx = canvas.getContext("2d")
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

        // Draw test sprites to test the canvas
        var pos = { x:0, y:0 }, lastHeight=0
        for (var sprite of Object.values(SPRITES)) {
            if (pos.x + sprite.width > size.width) {
                pos.x = 0
                pos.y += lastHeight + 1
            }
            sprite.draw(ctx, pos)
            pos.x += sprite.width
            lastHeight = sprite.height
        }


        // Clear the screen (magenta background)
        // SKIP: Draw the text
        // Draw the fuse
        // Draw the chest
        // Draw the lock
            // Draw any currently animating tumbler press
        // Draw the scroll
        // Draw the picks
        // Draw the selected pick
    }
}

/* Load the sprites */

SPRITES={
}

for (var i=0; i<18; i++) {
    SPRITES["pick_left_" + i] = new Sprite({
        x: 16*i, y: 1,  height: 12, width: 15, })
    SPRITES["pick_right_" + i] = new Sprite({
        x: 16*i, y: 19, height: 12, width: 15, })
    SPRITES["lock_open_" + i] = new Sprite({
        x: 16*i, y: 32, height: 11, width: 15, })
    SPRITES["lock_closed_" + i] = new Sprite({
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
}
for (var i=0; i<8; i++) {
    SPRITES["lock_" + i] = new Sprite({
        x: 48*i, y: 205, height: 63, width: 47, })
}
SPRITES["scroll"] = new Sprite({
    x: 1, y: 269, height: 102, width: 318, })
SPRITES["wick"] = new Sprite({
    x: 0, y: 374, height: 4, width: 108, })

/* Load the game */

window.addEventListener("load", (ev) => {
    // Load the game
    game = new Game()
    game.display()
});
