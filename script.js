document.addEventListener("DOMContentLoaded", () => {
    const intro = document.getElementById("intro");
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");
    const musicButton = document.getElementById("musicButton");
    const musicLabel = document.getElementById("musicLabel");
    const backgroundMusic = document.getElementById("backgroundMusic");
    const heroVideo = document.getElementById("heroVideo");

    let mediaStarted = false;
    let waitingForUserGesture = false;

    function updateMediaButton(playing, labelOverride) {
        if (!musicButton) return;
        musicButton.classList.toggle("is-playing", playing);
        musicButton.setAttribute("aria-label", playing ? "Pause background music and video" : "Play background music and video");
        if (musicLabel) musicLabel.textContent = labelOverride || (playing ? "Pause Music" : "Play Music");
    }

    function pauseMedia() {
        if (backgroundMusic) backgroundMusic.pause();
        if (heroVideo) heroVideo.pause();
        mediaStarted = false;
        updateMediaButton(false);
    }

    async function startMedia(fromUserGesture = false) {
        if (!backgroundMusic || !heroVideo) return false;
        try {
            // Start both media files from the same timestamp after the intro finishes.
            backgroundMusic.pause();
            heroVideo.pause();
            backgroundMusic.currentTime = 0;
            heroVideo.currentTime = 0;
            heroVideo.muted = true;
            const videoPromise = heroVideo.play();
            const audioPromise = backgroundMusic.play();
            const results = await Promise.allSettled([videoPromise, audioPromise]);
            const videoOk = results[0].status === "fulfilled";
            const audioOk = results[1].status === "fulfilled";

            if (videoOk && audioOk) {
                mediaStarted = true;
                waitingForUserGesture = false;
                updateMediaButton(true);
                return true;
            }

            // Do not let the video run alone if the browser blocks audio autoplay.
            heroVideo.pause();
            backgroundMusic.pause();
            mediaStarted = false;
            waitingForUserGesture = true;
            updateMediaButton(false, "Tap to Play");
            return false;
        } catch (error) {
            if (heroVideo) heroVideo.pause();
            if (backgroundMusic) backgroundMusic.pause();
            waitingForUserGesture = true;
            updateMediaButton(false, "Tap to Play");
            return false;
        }
    }

    function finishIntro() {
        if (intro) intro.remove();
        document.body.classList.remove("intro-active");
        startMedia(false);
    }

    let introAlreadyShown = false;
    try {
        introAlreadyShown = sessionStorage.getItem("holyMunchIntroShown") === "true";
    } catch (error) {
        introAlreadyShown = false;
    }

    if (intro && !introAlreadyShown) {
        document.body.classList.add("intro-active");
        try { sessionStorage.setItem("holyMunchIntroShown", "true"); } catch (error) {}
        // Intro animation is allowed to finish before video/audio begin.
        window.setTimeout(finishIntro, 9000);
    } else {
        if (intro) intro.remove();
        document.body.classList.remove("intro-active");
        startMedia(false);
    }

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            const isOpen = navLinks.classList.toggle("open");
            menuToggle.setAttribute("aria-expanded", String(isOpen));
            menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
            menuToggle.textContent = isOpen ? "✕" : "☰";
        });
        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("open");
                menuToggle.setAttribute("aria-expanded", "false");
                menuToggle.setAttribute("aria-label", "Open navigation");
                menuToggle.textContent = "☰";
            });
        });
    }

    if (backgroundMusic) {
        backgroundMusic.preload = "auto";
        backgroundMusic.loop = true;
    }
    if (heroVideo) {
        heroVideo.loop = true;
        heroVideo.muted = true;
        heroVideo.playsInline = true;
        // Keep the soundtrack aligned with the video timeline if their durations differ slightly.
        let lastSync = 0;
        heroVideo.addEventListener("timeupdate", () => {
            if (!mediaStarted || !backgroundMusic || backgroundMusic.paused || !Number.isFinite(backgroundMusic.duration) || backgroundMusic.duration <= 0) return;
            if (heroVideo.currentTime - lastSync < 1.5 && heroVideo.currentTime >= lastSync) return;
            lastSync = heroVideo.currentTime;
            const expectedAudioTime = heroVideo.currentTime % backgroundMusic.duration;
            if (Math.abs(backgroundMusic.currentTime - expectedAudioTime) > 0.45) {
                try { backgroundMusic.currentTime = expectedAudioTime; } catch (error) {}
            }
        });
    }

    if (musicButton) {
        musicButton.addEventListener("click", async () => {
            if (!mediaStarted || (backgroundMusic && backgroundMusic.paused)) {
                const started = await startMedia(true);
                if (!started) updateMediaButton(false, "Tap to Play");
            } else {
                pauseMedia();
            }
        });
    }

    // Browser audio autoplay may be blocked until the visitor interacts with the page.
    const resumeAfterGesture = async (event) => {
        if (musicButton && event && event.target && musicButton.contains(event.target)) return;
        if (waitingForUserGesture && !mediaStarted) {
            await startMedia(true);
            if (mediaStarted) {
                document.removeEventListener("pointerdown", resumeAfterGesture);
                document.removeEventListener("keydown", resumeAfterGesture);
            }
        }
    };
    document.addEventListener("pointerdown", resumeAfterGesture);
    document.addEventListener("keydown", resumeAfterGesture);

    // Leaving Home unloads this page and stops its media; this also handles browser navigation.
    window.addEventListener("pagehide", pauseMedia);

    document.querySelectorAll(".theme-swatch").forEach(button => {
        button.addEventListener("click", () => {
            document.documentElement.style.setProperty(
                "--primary",
                button.dataset.primary
            );

            document.documentElement.style.setProperty(
                "--secondary",
                button.dataset.secondary
            );

            document.querySelectorAll(".theme-swatch").forEach(item => {
                item.setAttribute("aria-pressed", "false");
            });

            button.setAttribute("aria-pressed", "true");
        });
    });

    const revealElements = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries, currentObserver) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        currentObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12 }
        );

        revealElements.forEach(element => {
            observer.observe(element);
        });
    } else {
        revealElements.forEach(element => {
            element.classList.add("visible");
        });
    }

    const year = document.getElementById("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    // PRODUCT TESTING DOCUMENTATION
    const testingForm = document.getElementById("testingForm");

    if (testingForm) {
        const testingRows = document.getElementById("testingRows");
        const testingMessage = document.getElementById("testingMessage");
        const clearTestingRecords = document.getElementById(
            "clearTestingRecords"
        );

        const testingRecords = [];

        const fields = [
            "testDate",
            "productTested",
            "appearance",
            "texture",
            "taste",
            "cheese",
            "feedback",
            "improvement"
        ];

        function renderTestingRecords() {
            testingRows.replaceChildren();

            if (testingRecords.length === 0) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 8;
                cell.textContent = "No testing records entered yet.";

                row.appendChild(cell);
                testingRows.appendChild(row);

                return;
            }

            testingRecords.forEach(record => {
                const row = document.createElement("tr");

                record.forEach(value => {
                    const cell = document.createElement("td");

                    cell.textContent = value || "—";
                    row.appendChild(cell);
                });

                testingRows.appendChild(row);
            });
        }

        testingForm.addEventListener("submit", event => {
            event.preventDefault();

            const record = fields.map(id => {
                return document.getElementById(id).value.trim();
            });

            testingRecords.push(record);

            renderTestingRecords();
            testingForm.reset();

            testingMessage.textContent =
                "Testing record added temporarily. It will not be saved permanently.";
        });

        if (clearTestingRecords) {
            clearTestingRecords.addEventListener("click", () => {
                testingRecords.length = 0;

                renderTestingRecords();

                testingMessage.textContent =
                    "Temporary testing records cleared.";
            });
        }
    }
});
