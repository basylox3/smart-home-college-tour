"use client";

import { useEffect, useRef, useState } from "react";

const closeDelayMs = 900;
const imageSlideMs = 2600;

type IntroFrame = {
  kind: "image" | "video";
  number: number;
  src: string;
  title: string;
  text: string;
};

const introFrames: IntroFrame[] = [
  ["Входная точка", "Начало маршрута показывает колледж как открытое пространство, куда посетитель попадает сразу после приветственного видео."],
  ["Первое впечатление", "Кадр помогает спокойно рассмотреть окружение и настроиться на дальнейшую прогулку по зданию."],
  ["Маршрут начинается", "Интро постепенно переводит внимание от общего вида к деталям, чтобы знакомство не ощущалось резким."],
  ["Пространство корпуса", "Этот фрагмент показывает масштаб и атмосферу учебной среды, где проходят повседневные занятия."],
  ["Учебная зона", "Кадр акцентирует внимание на месте, в котором студентам удобно работать, общаться и готовиться к проектам."],
  ["Детали среды", "Здесь важны небольшие элементы пространства: они делают маршрут живым и помогают лучше представить колледж."],
  ["Навигация внутри", "Последовательность кадров ведет зрителя дальше, как короткая экскурсия перед переходом к сайту."],
  ["Рабочая атмосфера", "Фотография раскрывает спокойный учебный ритм и показывает колледж не только снаружи, но и изнутри."],
  ["Место для общения", "Кадр подчеркивает, что колледж состоит не только из аудиторий, но и из пространств для встреч и движения."],
  ["Современная подача", "Визуальный переход делает просмотр похожим на креативную статью, где каждое изображение становится отдельной главой."],
  ["Переход по маршруту", "Этот этап сохраняет плавный темп и дает время воспринять картинку без спешки."],
  ["Внутренний ритм", "Кадр показывает, как разные зоны колледжа складываются в единое понятное пространство."],
  ["Атмосфера обучения", "Фотография добавляет ощущение присутствия и помогает представить реальный день внутри колледжа."],
  ["Крупнее к деталям", "На этом шаге внимание смещается к фактуре, свету и конкретным визуальным признакам места."],
  ["Перед финалом", "Кадр завершает фотомаршрут и подготавливает зрителя к последнему видеофрагменту."],
  ["Финальный кадр", "Последнее фото закрывает визуальную прогулку и логично переводит интро к библиотеке."],
].map(([title, text], index) => {
  const number = index + 1;
  const extension = number === 8 || number === 13 ? "png" : "jpeg";

  return {
    kind: "image",
    number,
    src: `/longread/${number}.${extension}`,
    title,
    text,
  };
});

introFrames.push({
  kind: "video",
  number: 17,
  src: "/longread/library.mp4",
  title: "Библиотека",
  text: "Финальное видео завершает интро, после чего сайт плавно открывается для использования.",
});

export function IntroVideoOverlay() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sequenceVideoRef = useRef<HTMLVideoElement | null>(null);
  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const slideTimerRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [phase, setPhase] = useState<"entrance" | "sequence">("entrance");
  const [activeFrame, setActiveFrame] = useState(0);
  const [needsStart, setNeedsStart] = useState(false);

  const closeIntro = () => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;
    videoRef.current?.pause();
    sequenceVideoRef.current?.pause();
    if (slideTimerRef.current !== null) {
      window.clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }

    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      document.body.classList.add("intro-video-complete");
      window.dispatchEvent(new Event("intro-video:complete"));
    }, closeDelayMs);
  };

  const showNextFrame = () => {
    setActiveFrame((current) => {
      const next = current + 1;

      if (next >= introFrames.length) {
        closeIntro();
        return current;
      }

      return next;
    });
  };

  const startSequence = () => {
    setNeedsStart(false);
    setActiveFrame(0);
    setPhase("sequence");
  };

  const startVideo = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setNeedsStart(false);
    video.muted = true;
    void video.play().catch(() => {
      if (!isClosingRef.current) {
        setNeedsStart(true);
      }
    });
  };

  const continueSequenceVideo = () => {
    const video = sequenceVideoRef.current;

    if (!video) {
      return;
    }

    setNeedsStart(false);
    video.muted = true;
    void video.play().catch(() => {
      if (!isClosingRef.current) {
        setNeedsStart(true);
      }
    });
  };

  useEffect(() => {
    document.body.classList.remove("intro-video-complete");
    startVideo();

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }

      if (slideTimerRef.current !== null) {
        window.clearTimeout(slideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "sequence" || isClosing) {
      return;
    }

    const frame = introFrames[activeFrame];

    if (slideTimerRef.current !== null) {
      window.clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }

    if (frame.kind === "image") {
      slideTimerRef.current = window.setTimeout(showNextFrame, imageSlideMs);
      return () => {
        if (slideTimerRef.current !== null) {
          window.clearTimeout(slideTimerRef.current);
        }
      };
    }

    const video = sequenceVideoRef.current;

    if (!video) {
      return;
    }

    setNeedsStart(false);
    video.currentTime = 0;
    video.muted = true;
    void video.play().catch(() => {
      if (!isClosingRef.current) {
        setNeedsStart(true);
      }
    });
  }, [activeFrame, isClosing, phase]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    document.body.classList.add("intro-video-lock");

    return () => {
      document.body.classList.remove("intro-video-lock");
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  const frame = introFrames[activeFrame];
  const progress = phase === "sequence" ? ((activeFrame + 1) / introFrames.length) * 100 : 0;

  return (
    <section
      className={isClosing ? "intro-video is-closing" : phase === "sequence" ? "intro-video is-sequence" : "intro-video"}
      role="dialog"
      aria-modal="true"
      aria-label="Вход в колледж"
    >
      {phase === "entrance" ? (
        <video
          ref={videoRef}
          className="intro-video__media"
          src="/intro/college-entrance.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          onEnded={startSequence}
          onError={startSequence}
        />
      ) : (
        <div className={frame.kind === "video" ? "intro-sequence is-video-frame" : activeFrame % 2 === 0 ? "intro-sequence is-even-frame" : "intro-sequence is-odd-frame"} key={frame.number}>
          <div className="intro-sequence__media">
            {frame.kind === "image" ? (
              <img src={frame.src} alt={`Кадр ${frame.number} интро о колледже`} />
            ) : (
              <video
                ref={sequenceVideoRef}
                src={frame.src}
                muted
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
                onEnded={showNextFrame}
                onError={showNextFrame}
              />
            )}
          </div>
          <div className="intro-sequence__copy">
            <span>{String(frame.number).padStart(2, "0")} / {String(introFrames.length).padStart(2, "0")}</span>
            <h2>{frame.title}</h2>
            <p>{frame.text}</p>
          </div>
          <div className="intro-sequence__progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <div className="intro-video__shade" aria-hidden="true" />
      <div className="intro-video__content">
        <p>{phase === "sequence" ? "Знакомство с колледжем" : "Вход в колледж"}</p>
        <button className="intro-video__skip" type="button" onClick={closeIntro}>
          Пропустить
        </button>
        {needsStart ? (
          <button className="intro-video__button" type="button" onClick={phase === "sequence" ? continueSequenceVideo : startVideo}>
            Продолжить
          </button>
        ) : null}
      </div>
    </section>
  );
}
