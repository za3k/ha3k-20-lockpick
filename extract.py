"""Given a screenshot of hillsfar lock-picking, extract the cool bits"""
import PIL, PIL.Image, PIL.ImageShow, PIL.ImageDraw
import hashlib
import os, sys

# Open with viewnoir, not xdg-open
class ImageShow2(PIL.ImageShow.Viewer):
    def get_command(self, file, **options):
        return "viewnior {}".format(file)
PIL.ImageShow.register(ImageShow2(), 0)

def hashImg(im):
    return hashlib.md5(im.tobytes()).hexdigest()[:5]
def mkdir(d):
    try:
        os.mkdir(d)
    except FileExistsError:
        pass
def palette(im):
    pal = set()
    pixdata = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            pal.add(pixdata[x,y])
    return sorted(pal)

MAGENTA = (255, 85, 255, 255)
GREEN = (0, 255, 0, 255)
YELLOW = (255, 255, 85, 255)
BLUE = (0, 0, 170, 255)
LIGHTBLUE = (85, 85, 255, 255)
LIGHTGREY = (170, 170, 170, 255)
CLEAR = (0, 0, 0, 0)
def replace(im, old, new):
    pixdata = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            if pixdata[x,y] == old:
                pixdata[x,y] = new
    return im
def empty(im):
    pixdata = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            if pixdata[x,y] != CLEAR:
                return False
    return True

def horiz(images):
    width = sum(i.size[0] for i in images) + len(images)-1
    height = max(i.size[1] for i in images)
    dst = PIL.Image.new("RGBA", (width, height))
    l = 0
    for i in images:
        dst.paste(i, (l, 0))
        l += i.size[0] + 1
    return dst
def vert(images):
    width = max(i.size[0] for i in images)
    height = sum(i.size[1] for i in images) + len(images)-1
    dst = PIL.Image.new("RGBA", (width, height))
    t = 0
    for i in images:
        dst.paste(i, (0, t))
        t += i.size[1] + 1
    return dst
    
def save_bit(im, box, part, background=CLEAR, draw=False):
    # Replace magenta and yellow with alpha
    bit = im.crop(box)
    mkdir("image")
    mkdir("image/{}".format(part))
    replace(bit, background, CLEAR)
    if not empty(bit):
        if hashImg(bit) == "0b954": raise Exception("HELP")
        bit.save("image/{}/{}_{}.png".format(part, part, hashImg(bit)))
        PIL.ImageDraw.Draw(im).rectangle(box, outline=GREEN)
def save_pick(pick, background=YELLOW):
    W = 31
    PICK_PARTS = {
        "pick_left": (0,0,31,W),
        "pick_right": (159-W,0,159,31),
        "pick_center": (W+1,0,158-W,31)
    }
    #dp = PIL.ImageDraw.Draw(pick)
    for part, box in PICK_PARTS.items():
        save_bit(pick, box, part, background=background)
        #dp.rectangle(box, outline=GREEN)
def findHorizLines(im, color):
    pixdata = im.load()
    for y in range(im.size[1]):
        if all(pixdata[x,y]==color for x in range(im.size[0])):
            yield y
def save_tumbler(tumbler):
    if tumbler.getpixel((0,0)) == MAGENTA: return
    if hashImg(tumbler) == "7e395": # The "end" tumbler
        save_bit(tumbler, (0,0,tumbler.size[0],tumbler.size[1]), "spring")
        return

    lightBlueLine = max(findHorizLines(tumbler, LIGHTBLUE))
    greyLine = max(findHorizLines(tumbler, LIGHTGREY))
    # "Fully Compressed" spring: 95
    # "Partly Compressed" spring: 87
    # "Uncompressed" spring: 79

    # Copy the spring bit
    spring = tumbler.copy()
    sd = PIL.ImageDraw.Draw(spring)
    sd.rectangle((0, 32, spring.size[0], lightBlueLine-9), fill=LIGHTGREY, outline=LIGHTGREY)
    save_bit(spring, (0,0,tumbler.size[0],tumbler.size[1]), "spring")

    #print(hashImg(tumbler), lightBlueLine, greyLine, lightBlueLine-greyLine)

    # Extract the rest
    closed = len([x for x in range(tumbler.size[0]) if tumbler.getpixel((x, lightBlueLine-41))==LIGHTBLUE]) > 20

    # Detect if it's matched
    if closed:
        save_bit(tumbler, (0,lightBlueLine-41,tumbler.size[0],lightBlueLine-9),"pin_closed", background=LIGHTGREY)
    else:
        save_bit(tumbler, (0,lightBlueLine-31,tumbler.size[0],lightBlueLine-9),"pin_open", background=LIGHTGREY)
    #tumbler.save("out.png")

    #save_bit(tumbler, tumbler.size, "tumbler")
def extract_bits(im):
    # Make sure it's a lock-picking scene
    if MAGENTA != im.getpixel((0, 0)): return False
    if MAGENTA != im.getpixel((0, 399)): return False
    if empty(replace(im.crop((48, 128, 207, 158)), MAGENTA, CLEAR)): return False

    tumbler_width = 32
    pick_width, pick_height = 159, 30
    PARTS = {
        "fuse": (14, 20, 241, 40),
        "dialogue": (14, 46, 241, 113),
        "lockImage": (256, 16, 351, 143),
        "lock": (352, 16, 639, 143),
        "scroll": (2, 182, 637, 389),
        "scrollPick": (48, 224, 591, 351), # Area with grid of picks
        "currentPick": (48, 128, 48+pick_width, 128+pick_height),
    }

    COL_SPACE, ROW_SPACE = 192, 32
    for row in range(4):
        for col in range(3):
            left, top, _, _ = PARTS["scrollPick"]
            pick_left = COL_SPACE*col + left
            pick_top = ROW_SPACE*row + top
            PARTS["pick{}".format(row*3+col)] = (
                pick_left, pick_top,
                pick_left + pick_width, pick_top+pick_height
            )
    for tumbler in range(9):
        left, top, _, bottom = PARTS["lock"]
        PARTS["tumbler{}".format(tumbler)] = (
            left + tumbler_width * tumbler, top,
            left + tumbler_width * (tumbler + 1) - 1, bottom
        )

    draw = PIL.ImageDraw.Draw(im)

    # Fudge a single abberant pixel from the scroll backing
    abberant_pixel = (PARTS["scrollPick"][0], PARTS["scrollPick"][3]-3)
    for w in range(2):
        for h in range (2):
            im.putpixel((abberant_pixel[0]+w, abberant_pixel[1]+h), YELLOW)
    
    save_bit(im, PARTS["fuse"], "fuse", background=MAGENTA)
    save_bit(im, PARTS["dialogue"], "dialogue")
    save_bit(im, PARTS["lockImage"], "lockImage", background=MAGENTA)
    save_pick(im.crop(PARTS["currentPick"]), background=MAGENTA)
    for x in [n for n in PARTS.keys() if n.startswith("tumbler")]:
        save_tumbler(im.crop(PARTS[x]))
    for x in [n for n in PARTS.keys() if n.startswith("pick")]:
        save_pick(im.crop(PARTS[x]), background=YELLOW)
    #im.save("out.png")

    return True

def open_type1(part, h):
    blank = False
    if h.startswith("X"):
        blank = True
        h = h[1:]
    i = PIL.Image.open("image/{}/{}_{}.png".format(part, part, h))
    if blank:
        PIL.ImageDraw.Draw(i).rectangle(((0, 0), i.size), fill=CLEAR)
    return i
    
def open_type(part, hashes):
    return [open_type1(part, h) for h in hashes]

def final_output():
    picks_center = open_type("pick_center", "a9580 47aa0 59282".split())
    picks_left = open_type("pick_left",   "17730 3f8ef 55d46 a2ce6 82d9d 4b6b7 42848 1a437 be8bf b8916 42ac6 244ba f6a4f 4b684 52eb9 9d609 a01b1 74440".split())
    picks_right = open_type("pick_right", "f23af cf007 f0113 0173b 01b57 476f7 0a802 68cf3 7baea 9a0bf 12fae 28515 4f97c 67d5d a14a2 6cdf3 50b9d 75d3f ".split())
    springs = open_type("spring", "7e395 835d2 1c90d 49ae3".split())
    pins_open = open_type("pin_open",     "69deb eeeef 20482 9db1a c6da4 e418d 0d794 52ad8 59d5c 61822 e3ea4 22104 52385 84e93 06365 4e248 0419a 4dbdb 60e81".split())
    pins_closed = open_type("pin_closed", "06ed8 77cc0 7d40b c2b6c b6d23 937ca 72018 3f0a2 cc9ec cd422 c44e9 4665d 8fc83 397af 3d7e9 82aa5 2ed89".split())

    locks = open_type("lockImage", "fa71e b7e18 10917 d20b8 7e23c 96249 b818e ddd91 f14b5 fbc28 7fefc".split())

    im2 = vert([
        horiz(picks_left),
        horiz(picks_right),
        horiz(pins_open),
        horiz(pins_closed),
        horiz(picks_center),
        horiz(springs),
        horiz(locks[:3]),
        horiz(locks[3:]),
        replace(PIL.Image.open("template.png").crop((0,182,637,389)).convert("RGBA"), MAGENTA, CLEAR),
    ])
    im2.save("spritesheet.png")

def extract_all(dir, limit=9999999):
    for filename in os.listdir(dir):
        path = os.path.join(dir, filename)
        image = PIL.Image.open(path).convert("RGBA")
        try:
            if extract_bits(image):
                limit-=1
                if limit <=0: return
        except Exception:
            print(path)
            raise

if __name__ == "__main__":
    dir = sys.argv[1]
    #extract_all(dir, limit=1)
    #extract_all(dir)
    final_output()

