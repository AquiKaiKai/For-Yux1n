 
window.requestAnimationFrame =
window.__requestAnimationFrame ||
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    (function () {
        return function (callback, element) {
            var lastTime = element.__lastTime;
            if (lastTime === undefined) {
                lastTime = 0;
            }
            var currTime = Date.now();
            var timeToCall = Math.max(1, 33 - (currTime - lastTime));
            window.setTimeout(callback, timeToCall);
            element.__lastTime = currTime + timeToCall;
        };
    })();

window.isDevice =
(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(((navigator.userAgent || navigator.vendor || window.opera)).toLowerCase()));

var started = false;
var init = function () {
    if (started) return;
    started = true;

    var mobile = window.isDevice;
    var ratio = window.devicePixelRatio || 1;
    if (mobile) {
        ratio = Math.min(ratio, 2);
    }

    var canvas = document.getElementById('heart');
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) {
        ctx.imageSmoothingQuality = 'high';
    }

    var resizeCanvas = function () {
        var width = innerWidth;
        var height = innerHeight;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        return { width: width, height: height };
    };

    var heartSizes = [];
    var dimensions = resizeCanvas();
    var width = dimensions.width;
    var height = dimensions.height;
    var rand = Math.random;

    var setHeartSizes = function () {
        var maxSize = Math.min(width, height);
        if (mobile) {
            heartSizes = [
                [maxSize * 0.45, maxSize * 0.028],
                [maxSize * 0.33, maxSize * 0.018],
                [maxSize * 0.20, maxSize * 0.011]
            ];
        } else {
            heartSizes = [
                [maxSize * 0.5, maxSize * 0.032],
                [maxSize * 0.35, maxSize * 0.021],
                [maxSize * 0.2, maxSize * 0.012]
            ];
        }
    };

    setHeartSizes();

    var heartPosition = function (rad) {
        return [Math.pow(Math.sin(rad), 3),
            -(15 * Math.cos(rad) - 5 *
            Math.cos(2 * rad) - 2 *
            Math.cos(3 * rad) - Math.cos(4 * rad))];
    };
    var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
        return [dx + pos[0] * sx, dy + pos[1] * sy];
    };

    window.addEventListener('resize', function () {
        var dimensions = resizeCanvas();
        width = dimensions.width;
        height = dimensions.height;
        setHeartSizes();
    });

    var particleSize = mobile ? 2 : 1;
    var traceCount = mobile ? 10 : 45;
    var pointsOrigin = [];
    var i;
    var dr = mobile ? 0.45 : 0.12;
    for (i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), heartSizes[0][0], heartSizes[0][1], 0, 0));
    for (i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), heartSizes[1][0], heartSizes[1][1], 0, 0));
    for (i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), heartSizes[2][0], heartSizes[2][1], 0, 0));
    var heartPointsCount = pointsOrigin.length;

    var targetPoints = [];
    var outlineSize = mobile ? 4 : 2;
    var outlineColor = mobile ? "rgba(255, 160, 255, 0.3)" : "rgba(255, 160, 255, 0.2)";
    var pulse = function (kx, ky) {
        for (i = 0; i < pointsOrigin.length; i++) {
            targetPoints[i] = [];
            targetPoints[i][0] = kx * pointsOrigin[i][0] + width / 2;
            targetPoints[i][1] = ky * pointsOrigin[i][1] + height / 2;
        }
    };

    var drawHeartOutline = function () {
        ctx.save();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineSize;
        ctx.shadowColor = outlineColor;
        ctx.shadowBlur = outlineSize * 2;
        ctx.beginPath();
        for (i = 0; i < targetPoints.length; i++) {
            var p = targetPoints[i];
            if (i === 0) {
                ctx.moveTo(p[0], p[1]);
            } else {
                ctx.lineTo(p[0], p[1]);
            }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    };

    var e = [];
    for (i = 0; i < heartPointsCount; i++) {
        var x = rand() * width;
        var y = rand() * height;
        e[i] = {
            vx: 0,
            vy: 0,
            R: 2,
            speed: rand() + 5,
            q: ~~(rand() * heartPointsCount),
            D: 2 * (i % 2) - 1,
            force: 0.2 * rand() + 0.7,
            f: "rgba(180, 80, 255, 0.35)",
            trace: []
        };
        for (var k = 0; k < traceCount; k++) e[i].trace[k] = {x: x, y: y};
    }

    var config = {
        traceK: 0.4,
        timeDelta: 0.01
    };

    var time = 0;
    var loop = function () {
        var n = -Math.cos(time);
        pulse((1 + n) * .5, (1 + n) * .5);
        time += ((Math.sin(time)) < 0 ? 9 : (n > 0.8) ? .2 : 1) * config.timeDelta;
        ctx.fillStyle = "rgba(0,0,0,.08)";
        ctx.fillRect(0, 0, width, height);
        drawHeartOutline();
        for (i = e.length; i--;) {
            var u = e[i];
            var q = targetPoints[u.q];
            var dx = u.trace[0].x - q[0];
            var dy = u.trace[0].y - q[1];
            var length = Math.sqrt(dx * dx + dy * dy);
            if (10 > length) {
                if (0.95 < rand()) {
                    u.q = ~~(rand() * heartPointsCount);
                }
                else {
                    if (0.99 < rand()) {
                        u.D *= -1;
                    }
                    u.q += u.D;
                    u.q %= heartPointsCount;
                    if (0 > u.q) {
                        u.q += heartPointsCount;
                    }
                }
            }
            u.vx += -dx / length * u.speed;
            u.vy += -dy / length * u.speed;
            u.trace[0].x += u.vx;
            u.trace[0].y += u.vy;
            u.vx *= u.force;
            u.vy *= u.force;
            for (k = 0; k < u.trace.length - 1;) {
                var T = u.trace[k];
                var N = u.trace[++k];
                N.x -= config.traceK * (N.x - T.x);
                N.y -= config.traceK * (N.y - T.y);
            }
            ctx.fillStyle = u.f;
            for (k = 0; k < u.trace.length; k++) {
                ctx.fillRect(u.trace[k].x, u.trace[k].y, particleSize, particleSize);
            }
        }

        window.requestAnimationFrame(loop, canvas);
    };

    loop();
};

var startButton = document.getElementById('start-heart');
var bgMusic = document.getElementById('bg-music');
var playlistBtn = document.getElementById('playlist-btn');

var startHeart = function () {
    if (started) return;
    if (startButton) {
        startButton.classList.add('is-started');
        startButton.disabled = true;
    }
    if (playlistBtn) {
        playlistBtn.classList.add('show');
    }
    if (bgMusic) {
        bgMusic.play().catch(function () {});
    }
    init();
};

if (playlistBtn) {
    playlistBtn.addEventListener('click', function () {
        window.open('https://open.spotify.com/playlist/7iLPMLei6UDICLul3cjx0y?si=4a3ce84f823048d0', '_blank');
    }, false);
}

if (startButton) {
    startButton.addEventListener('click', startHeart, false);
} else {
    startHeart();
}

