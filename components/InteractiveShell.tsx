"use client";

import { useEffect, useRef, useState } from "react";

type PointerState = {
  targetX: number;
  targetY: number;
  x: number;
  y: number;
};

type GsapRuntime = typeof import("gsap").gsap;
type GsapAnimation = { kill: () => unknown };
type GsapMatchMedia = ReturnType<GsapRuntime["matchMedia"]>;
type QuickTween = (value: number) => void;

export function InteractiveShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const [renderAmbient, setRenderAmbient] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const isCompactViewport = window.innerWidth < 980;
    const allowAmbientMotion = renderAmbient && !prefersReducedMotion && hasFinePointer && !isCompactViewport;

    const updateAmbientMode = () => {
      const canRenderAmbient =
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
        window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
        window.innerWidth >= 980;

      setRenderAmbient((current) => (current === canRenderAmbient ? current : canRenderAmbient));
    };

    updateAmbientMode();

    const gsapAnimations: GsapAnimation[] = [];
    let gsapRuntime: GsapRuntime | null = null;
    let gsapMedia: GsapMatchMedia | null = null;
    let disposed = false;
    const pointer: PointerState = {
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    let animationFrame = 0;
    let canvasFrame = 0;

    const floatingElements = [...document.querySelectorAll<HTMLElement>("[data-float]")];
    const floatingItems = floatingElements.map((element) => ({
      element,
      isInfoPanel: element.classList.contains("float-panel"),
      baseX: Number(element.dataset.x || 0),
      baseY: Number(element.dataset.y || 0),
      baseZ: Number(element.dataset.z || 0),
      depth: Number(element.dataset.depth || 0),
      baseRotateX: Number(element.dataset.rx || 0),
      baseRotateY: Number(element.dataset.ry || 0),
      baseRotateZ: Number(element.dataset.rz || 0),
    }));
    const tiltElements = [...document.querySelectorAll<HTMLElement>("[data-tilt]")];
    const revealElements = [...document.querySelectorAll<HTMLElement>(".reveal")];
    const magnets = [...document.querySelectorAll<HTMLElement>(".magnet")];
    const sceneFrames = [...document.querySelectorAll<HTMLElement>(".scene-frame")];
    const navToggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
    const siteNav = document.querySelector<HTMLElement>(".site-nav");
    const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".site-nav a")];
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d") || null;
    const interactiveSelector =
      ".button, .control-button, .review-delete, .game-file-card, .game-mobile-button, .nav-toggle, .site-nav a, .review-choice span";
    const pressTimers: number[] = [];

    const registerGsap = <T extends GsapAnimation>(animation: T) => {
      gsapAnimations.push(animation);
      return animation;
    };

    const getRevealKineticItems = (element: HTMLElement) =>
      [...element.querySelectorAll<HTMLElement>(".kinetic-item")].filter((item) => item.closest(".reveal") === element);

    const clearRevealAnimationProps = (element: HTMLElement) => {
      element.removeAttribute("data-reveal-animated");

      if (gsapRuntime) {
        gsapRuntime.set(element, { clearProps: "opacity,visibility,transform,filter" });
        const kineticItems = getRevealKineticItems(element);

        if (kineticItems.length > 0) {
          gsapRuntime.set(kineticItems, { clearProps: "opacity,visibility,transform" });
        }

        return;
      }

      element.style.removeProperty("opacity");
      element.style.removeProperty("visibility");
      element.style.removeProperty("transform");
      element.style.removeProperty("filter");
      getRevealKineticItems(element).forEach((item) => {
        item.style.removeProperty("opacity");
        item.style.removeProperty("visibility");
        item.style.removeProperty("transform");
      });
    };

    const animateReveal = (element: HTMLElement) => {
      if (!gsapRuntime || element.dataset.revealAnimated === "true") {
        return;
      }

      element.dataset.revealAnimated = "true";
      const isCompactReveal = window.innerWidth < 640;

      registerGsap(
        gsapRuntime.fromTo(
          element,
          {
            autoAlpha: 0,
            y: isCompactReveal ? 18 : 34,
            scale: isCompactReveal ? 1 : 0.985,
            filter: isCompactReveal ? "none" : "blur(10px)",
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: isCompactReveal ? 0.48 : 0.82,
            ease: "power3.out",
            clearProps: "opacity,visibility,transform,filter",
            onInterrupt: () => clearRevealAnimationProps(element),
          },
        ),
      );

      const kineticItems = getRevealKineticItems(element);

      if (kineticItems.length > 0) {
        registerGsap(
          gsapRuntime.fromTo(
            kineticItems,
            { autoAlpha: 0, y: isCompactReveal ? 12 : 22, scale: isCompactReveal ? 0.98 : 0.94 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: isCompactReveal ? 0.4 : 0.68,
              ease: "power3.out",
              stagger: isCompactReveal ? 0.035 : 0.058,
              delay: isCompactReveal ? 0.04 : 0.12,
              clearProps: "opacity,visibility,transform",
              onInterrupt: () => clearRevealAnimationProps(element),
            },
          ),
        );
      }
    };

    const updatePointerTarget = (clientX: number, clientY: number) => {
      pointer.targetX = clientX;
      pointer.targetY = clientY;
    };

    const getInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return null;
      }

      const element = target.closest(interactiveSelector) as HTMLElement | null;

      if (!element || element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
        return null;
      }

      return element;
    };

    const updateInteractiveTarget = (element: HTMLElement, clientX: number, clientY: number) => {
      const bounds = element.getBoundingClientRect();
      const x = bounds.width > 0 ? Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) : 0.5;
      const y = bounds.height > 0 ? Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height)) : 0.5;

      element.style.setProperty("--button-x", `${x * 100}%`);
      element.style.setProperty("--button-y", `${y * 100}%`);
      element.style.setProperty("--button-rx", `${(0.5 - y) * 9}deg`);
      element.style.setProperty("--button-ry", `${(x - 0.5) * 12}deg`);
      element.classList.add("is-cursor-active");
    };

    const handleInteractivePointerMove = (event: PointerEvent) => {
      const element = getInteractiveTarget(event.target);

      if (element) {
        updateInteractiveTarget(element, event.clientX, event.clientY);
      }
    };

    const handleInteractivePointerOut = (event: PointerEvent) => {
      const element = getInteractiveTarget(event.target);
      const nextTarget = event.relatedTarget;

      if (element && (!(nextTarget instanceof Node) || !element.contains(nextTarget))) {
        element.classList.remove("is-cursor-active", "is-pressing");
      }
    };

    const handleMouseMove = (event: MouseEvent) => updatePointerTarget(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];

      if (touch) {
        updatePointerTarget(touch.clientX, touch.clientY);
      }
    };

    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      root.style.setProperty("--progress", String(progress));
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button > 0) {
        return;
      }

      const interactiveElement = getInteractiveTarget(event.target);

      if (interactiveElement) {
        updateInteractiveTarget(interactiveElement, event.clientX, event.clientY);
        interactiveElement.classList.add("is-pressing");

        const pressTimer = window.setTimeout(() => interactiveElement.classList.remove("is-pressing"), 260);
        pressTimers.push(pressTimer);

        const bounds = interactiveElement.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "button-ripple";
        ripple.style.left = `${event.clientX - bounds.left}px`;
        ripple.style.top = `${event.clientY - bounds.top}px`;
        interactiveElement.appendChild(ripple);

        if (!prefersReducedMotion && gsapRuntime && hasFinePointer) {
          registerGsap(
            gsapRuntime.to(ripple, {
              autoAlpha: 0,
              scale: 2.6,
              duration: 0.68,
              ease: "power3.out",
              onComplete: () => ripple.remove(),
            }),
          );

          const burstDots = Array.from({ length: 10 }, (_, index) => {
            const dot = document.createElement("span");
            dot.className = "gsap-burst-dot";
            dot.style.left = `${event.clientX - bounds.left}px`;
            dot.style.top = `${event.clientY - bounds.top}px`;
            dot.style.setProperty("--burst-index", String(index));
            interactiveElement.appendChild(dot);
            return dot;
          });

          registerGsap(
            gsapRuntime.to(burstDots, {
              x: (index) => {
                return Math.cos((index / burstDots.length) * Math.PI * 2) * (34 + (index % 3) * 10);
              },
              y: (index) => {
                return Math.sin((index / burstDots.length) * Math.PI * 2) * (34 + (index % 3) * 10);
              },
              rotation: (index) => index * 42,
              autoAlpha: 0,
              scale: 0,
              duration: 0.72,
              ease: "power3.out",
              stagger: 0.014,
              onComplete: () => burstDots.forEach((dot) => dot.remove()),
            }),
          );
        } else {
          window.setTimeout(() => ripple.remove(), 680);
        }
      }

      if (!allowAmbientMotion || !gsapRuntime) {
        return;
      }

      const ripple = document.createElement("span");
      ripple.className = "tap-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);

      registerGsap(
        gsapRuntime.to(ripple, {
          autoAlpha: 0,
          scale: 1.9,
          duration: 0.76,
          ease: "power3.out",
          onComplete: () => ripple.remove(),
        }),
      );
    };

    const applyFloatingTransforms = (normalizedX: number, normalizedY: number) => {
      const positionScale = window.innerWidth < 640 ? 0.72 : window.innerWidth < 820 ? 0.86 : 1;
      const depthScale = window.innerWidth < 640 ? 0.88 : 1;

      floatingItems.forEach((item) => {
        const baseX = item.baseX * positionScale;
        const baseY = item.baseY * positionScale;
        const baseZ = item.baseZ * depthScale;
        const moveScale = item.isInfoPanel ? 0.26 : 1;
        const rotateScale = item.isInfoPanel ? 0 : 1;
        const moveX = normalizedX * item.depth * 180 * moveScale;
        const moveY = normalizedY * item.depth * 140 * moveScale;
        const rotateY = item.baseRotateY + normalizedX * item.depth * 40 * rotateScale;
        const rotateX = item.baseRotateX + normalizedY * item.depth * -34 * rotateScale;
        const rotateZ = item.baseRotateZ + normalizedX * item.depth * -8 * rotateScale;

        if (gsapRuntime) {
          gsapRuntime.set(item.element, {
            x: baseX + moveX,
            y: baseY + moveY,
            z: baseZ,
            xPercent: -50,
            yPercent: -50,
            rotationX: rotateX,
            rotationY: rotateY,
            rotationZ: rotateZ,
          });
        } else {
          item.element.style.transform = `translate3d(calc(-50% + ${baseX + moveX}px), calc(-50% + ${baseY + moveY}px), ${baseZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
        }
      });
    };

    const renderFloatingScene = () => {
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;

      const normalizedX = window.innerWidth ? (pointer.x / window.innerWidth - 0.5) * 2 : 0;
      const normalizedY = window.innerHeight ? (pointer.y / window.innerHeight - 0.5) * 2 : 0;

      if (glowRef.current) {
        if (gsapRuntime) {
          gsapRuntime.set(glowRef.current, { x: pointer.x - 208, y: pointer.y - 208 });
        } else {
          glowRef.current.style.transform = `translate3d(${pointer.x - 208}px, ${pointer.y - 208}px, 0)`;
        }
      }

      root.style.setProperty("--pointer-x", `${pointer.x}px`);
      root.style.setProperty("--pointer-y", `${pointer.y}px`);
      root.style.setProperty("--parallax-x", `${normalizedX * 18}px`);
      root.style.setProperty("--parallax-y", `${normalizedY * 18}px`);
      root.style.setProperty("--parallax-back-x", `${normalizedX * -6}px`);
      root.style.setProperty("--parallax-back-y", `${normalizedY * -6}px`);
      root.style.setProperty("--parallax-front-x", `${normalizedX * 8}px`);
      root.style.setProperty("--parallax-front-y", `${normalizedY * 8}px`);
      root.style.setProperty("--parallax-mid-x", `${normalizedX * -4}px`);
      root.style.setProperty("--parallax-mid-y", `${normalizedY * -4}px`);

      sceneFrames.forEach((frame) => {
        if (!prefersReducedMotion) {
          const frameRotateX = window.innerWidth < 640 ? normalizedY * -1.2 : normalizedY * -2.2;
          const frameRotateY = window.innerWidth < 640 ? normalizedX * 1.6 : normalizedX * 3.2;
          if (gsapRuntime) {
            gsapRuntime.set(frame, { rotationX: frameRotateX, rotationY: frameRotateY, transformPerspective: 1600 });
          } else {
            frame.style.transform = `perspective(1600px) rotateX(${frameRotateX}deg) rotateY(${frameRotateY}deg)`;
          }
        }
      });

      applyFloatingTransforms(normalizedX, normalizedY);
      animationFrame = window.requestAnimationFrame(renderFloatingScene);
    };

    const tiltCleanups = allowAmbientMotion
      ? tiltElements.map((element) => {
          let rotateXTo: QuickTween | null = null;
          let rotateYTo: QuickTween | null = null;
          let yTo: QuickTween | null = null;

          const ensureTiltTweens = () => {
            if (!gsapRuntime || rotateXTo || rotateYTo || yTo) {
              return;
            }

            gsapRuntime.set(element, { transformPerspective: 900, transformOrigin: "center" });
            rotateXTo = gsapRuntime.quickTo(element, "rotationX", { duration: 0.24, ease: "power3.out" });
            rotateYTo = gsapRuntime.quickTo(element, "rotationY", { duration: 0.24, ease: "power3.out" });
            yTo = gsapRuntime.quickTo(element, "y", { duration: 0.24, ease: "power3.out" });
          };

          const resetTilt = () => {
            if (gsapRuntime) {
              ensureTiltTweens();
              rotateXTo?.(0);
              rotateYTo?.(0);
              yTo?.(0);
            } else {
              element.style.transform = "";
            }
          };
          const handlePointerMove = (event: PointerEvent) => {
            if (prefersReducedMotion) {
              return;
            }

            const bounds = element.getBoundingClientRect();
            const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
            const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

            if (gsapRuntime) {
              ensureTiltTweens();
              rotateXTo?.(offsetY * -10);
              rotateYTo?.(offsetX * 10);
              yTo?.(-4);
            } else {
              element.style.transform = `perspective(900px) rotateX(${offsetY * -10}deg) rotateY(${offsetX * 10}deg) translateY(-4px)`;
            }
          };

          element.addEventListener("pointermove", handlePointerMove);
          element.addEventListener("pointerleave", resetTilt);
          element.addEventListener("pointercancel", resetTilt);

          return () => {
            element.removeEventListener("pointermove", handlePointerMove);
            element.removeEventListener("pointerleave", resetTilt);
            element.removeEventListener("pointercancel", resetTilt);
            gsapRuntime?.killTweensOf(element);
          };
        })
      : [];

    const magnetCleanups = allowAmbientMotion
      ? magnets.map((element) => {
          let xTo: QuickTween | null = null;
          let yTo: QuickTween | null = null;

          const ensureMagnetTweens = () => {
            if (!gsapRuntime || xTo || yTo) {
              return;
            }

            xTo = gsapRuntime.quickTo(element, "x", { duration: 0.28, ease: "power3.out" });
            yTo = gsapRuntime.quickTo(element, "y", { duration: 0.28, ease: "power3.out" });
          };

          const resetMagnet = () => {
            if (gsapRuntime) {
              ensureMagnetTweens();
              xTo?.(0);
              yTo?.(0);
            } else {
              element.style.transform = "";
            }
          };
          const handlePointerMove = (event: PointerEvent) => {
            if (prefersReducedMotion) {
              return;
            }

            const bounds = element.getBoundingClientRect();
            const x = event.clientX - bounds.left - bounds.width / 2;
            const y = event.clientY - bounds.top - bounds.height / 2;

            if (gsapRuntime) {
              ensureMagnetTweens();
              xTo?.(x * 0.08);
              yTo?.(y * 0.08);
            } else {
              element.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
            }
          };

          element.addEventListener("pointermove", handlePointerMove);
          element.addEventListener("pointerleave", resetMagnet);
          element.addEventListener("pointercancel", resetMagnet);

          return () => {
            element.removeEventListener("pointermove", handlePointerMove);
            element.removeEventListener("pointerleave", resetMagnet);
            element.removeEventListener("pointercancel", resetMagnet);
            gsapRuntime?.killTweensOf(element);
          };
        })
      : [];

    const navCleanups: Array<() => void> = [];

    if (navToggle && siteNav) {
      const handleToggle = () => {
        const expanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!expanded));
        siteNav.classList.toggle("is-open", !expanded);
        document.body.classList.toggle("site-nav-open", !expanded);

        if (!expanded && gsapRuntime && !prefersReducedMotion) {
          registerGsap(
            gsapRuntime.fromTo(
              siteNav,
              { autoAlpha: 0, y: -12, scale: 0.98 },
              { autoAlpha: 1, y: 0, scale: 1, duration: 0.26, ease: "power2.out", clearProps: "opacity,visibility,transform" },
            ),
          );
        }
      };
      const closeNav = () => {
        navToggle.setAttribute("aria-expanded", "false");
        siteNav.classList.remove("is-open");
        document.body.classList.remove("site-nav-open");
      };

      navToggle.addEventListener("click", handleToggle);
      navLinks.forEach((link) => link.addEventListener("click", closeNav));
      navCleanups.push(() => navToggle.removeEventListener("click", handleToggle));
      navCleanups.push(...navLinks.map((link) => () => link.removeEventListener("click", closeNav)));
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            animateReveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );

    revealElements.forEach((element) => {
      if (prefersReducedMotion) {
        element.classList.add("is-visible");
      } else {
        observer.observe(element);
      }
    });

    import("gsap").then(({ gsap }) => {
      if (disposed) {
        return;
      }

      gsapRuntime = gsap;
      gsap.defaults({ overwrite: "auto" });

      document.querySelectorAll<HTMLElement>(".reveal.is-visible").forEach(animateReveal);

      gsapMedia = gsap.matchMedia();
      gsapMedia.add(
        {
          isDesktop: "(min-width: 980px) and (hover: hover) and (pointer: fine)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const conditions = context.conditions as { isDesktop?: boolean; reduceMotion?: boolean } | undefined;

          if (!allowAmbientMotion || !conditions?.isDesktop || conditions.reduceMotion) {
            return;
          }

        const introTimeline = gsap.timeline({ defaults: { duration: 0.82, ease: "power3.out" } });

        introTimeline
          .fromTo(".site-header", { autoAlpha: 0, y: -22, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1 }, 0)
          .fromTo(".hero-copy .eyebrow", { autoAlpha: 0, x: -18 }, { autoAlpha: 1, x: 0 }, 0.12)
          .fromTo(
            ".hero h1",
            { autoAlpha: 0, y: 42, scale: 0.96, filter: "blur(14px)" },
            { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.96 },
            0.18,
          )
          .fromTo(".hero-text", { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0 }, 0.3)
          .fromTo(".hero-actions .button", { autoAlpha: 0, y: 18, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.06 }, 0.42)
          .fromTo(".hero-signal-card", { autoAlpha: 0, x: -18, scale: 0.96 }, { autoAlpha: 1, x: 0, scale: 1 }, 0.5)
          .fromTo(".hero-hud-card", { autoAlpha: 0, y: 18, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.052 }, 0.56)
          .fromTo(".hero-badges li", { autoAlpha: 0, y: 18, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, stagger: 0.046 }, 0.56)
          .fromTo(".hero-stage", { autoAlpha: 0, y: 36, rotationY: -8, scale: 0.96 }, { autoAlpha: 1, y: 0, rotationY: 0, scale: 1 }, 0.26)
          .fromTo(".float-panel", { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, stagger: 0.07 }, 0.74);

        gsap.fromTo(".brand-mark", { rotation: -5 }, { rotation: 5, scale: 1.05, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(".ambient-orbits span", { rotation: 360, duration: 18, repeat: -1, ease: "none", stagger: 0.35 });
        gsap.fromTo(
          ".scene-satellite span",
          { y: -8, rotation: -4, scale: 0.96 },
          { y: 10, rotation: 5, scale: 1.05, duration: 3.1, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.18 },
        );
        gsap.fromTo(
          ".signal-bars span",
          { scaleY: 0.36, autoAlpha: 0.46 },
          { scaleY: 1, autoAlpha: 1, duration: 0.92, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.096 },
        );
        gsap.to(".hero-hud-card", { y: -8, autoAlpha: 1, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.22 });
        gsap.fromTo(
          ".holo-node",
          { autoAlpha: 0.34, filter: "blur(0px)" },
          { autoAlpha: 1, filter: "blur(2px)", duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.16 },
        );
        gsap.fromTo(
          ".motion-ribbon span",
          { x: -16, autoAlpha: 0.56 },
          { x: 16, autoAlpha: 1, duration: 2.2, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.11 },
        );
        gsap.fromTo(".data-streams span", { x: "-18vw" }, { x: "118vw", duration: 5.2, repeat: -1, ease: "none", stagger: 0.42 });
        gsap.fromTo(".data-streams span", { autoAlpha: 0 }, { autoAlpha: 0.9, duration: 0.85, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.42 });
        gsap.fromTo(
          ".depth-cube",
          { autoAlpha: 0.48, filter: "drop-shadow(0 0 8px rgba(114, 247, 255, 0.18))" },
          {
            autoAlpha: 0.92,
            filter: "drop-shadow(0 0 26px rgba(255, 92, 247, 0.34))",
            duration: 2.6,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
            stagger: 0.26,
          },
        );
        gsap.to(".gsap-drone", {
          keyframes: [
            { x: 18, y: -24, duration: 1.8, ease: "sine.inOut" },
            { x: -14, y: 14, duration: 2.2, ease: "sine.inOut" },
            { x: 8, y: -8, duration: 1.6, ease: "sine.inOut" },
          ],
          rotation: 10,
          scale: 1.08,
          yoyo: true,
          repeat: -1,
          repeatDelay: 0.42,
          ease: "sine.inOut",
          stagger: 0.18,
        });
        gsap.to(".gsap-axis", { rotation: 360, scale: 1.16, autoAlpha: 0.72, duration: 6.2, yoyo: true, repeat: -1, ease: "none", stagger: 0.24 });
        gsap.fromTo(
          ".gsap-helix span",
          { y: (index) => (index % 2 === 0 ? -18 : 18), scale: 0.62, autoAlpha: 0.28 },
          { y: (index) => (index % 2 === 0 ? 18 : -18), scale: 1.12, autoAlpha: 0.92, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.08 },
        );
        gsap.to(".progress-line", {
          filter: "drop-shadow(0 0 18px rgba(99, 217, 255, 0.52))",
          duration: 1.8,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
        },
      );
    });

    let width = 0;
    let height = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; depth: number }> = [];

    const createParticles = () => {
      const density = window.innerWidth < 640 ? 18 : window.innerWidth < 980 ? 26 : 38;
      particles = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        size: Math.random() * 2.2 + 0.8,
        depth: Math.random() * 0.8 + 0.2,
      }));
    };

    const resizeCanvas = () => {
      if (!canvas || !context) {
        return;
      }

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      createParticles();
    };

    const drawCanvas = () => {
      if (!context) {
        return;
      }

      context.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        const force = Math.max(0, 140 - distance) / 140;

        particle.vx += (dx / distance) * force * 0.004 * particle.depth;
        particle.vy += (dy / distance) * force * 0.004 * particle.depth;
        particle.x += particle.vx + (pointer.x / width - 0.5) * particle.depth * 0.16;
        particle.y += particle.vy + (pointer.y / height - 0.5) * particle.depth * 0.16;
        particle.vx *= 0.992;
        particle.vy *= 0.992;

        if (particle.x < -40) particle.x = width + 40;
        if (particle.x > width + 40) particle.x = -40;
        if (particle.y < -40) particle.y = height + 40;
        if (particle.y > height + 40) particle.y = -40;

        context.beginPath();
        context.fillStyle = `rgba(108, 231, 255, ${0.16 + particle.depth * 0.28})`;
        context.arc(particle.x, particle.y, particle.size * particle.depth, 0, Math.PI * 2);
        context.fill();

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const linkDistance = Math.hypot(particle.x - next.x, particle.y - next.y);

          if (linkDistance <= 130) {
            context.beginPath();
            context.strokeStyle = `rgba(154, 124, 255, ${0.12 - linkDistance / 1500})`;
            context.lineWidth = 1;
            context.moveTo(particle.x, particle.y);
            context.lineTo(next.x, next.y);
            context.stroke();
          }
        }
      });

      if (!prefersReducedMotion) {
        canvasFrame = window.requestAnimationFrame(drawCanvas);
      }
    };

    window.addEventListener("resize", updateAmbientMode);

    if (allowAmbientMotion) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("resize", resizeCanvas);
    }

    if (hasFinePointer) {
      window.addEventListener("pointermove", handleInteractivePointerMove, { passive: true });
      window.addEventListener("pointerout", handleInteractivePointerOut);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    if (allowAmbientMotion) {
      resizeCanvas();
      drawCanvas();
      animationFrame = window.requestAnimationFrame(renderFloatingScene);
    } else {
      applyFloatingTransforms(0, 0);
    }

    return () => {
      disposed = true;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("pointermove", handleInteractivePointerMove);
      window.removeEventListener("pointerout", handleInteractivePointerOut);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateAmbientMode);
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(canvasFrame);
      observer.disconnect();
      pressTimers.forEach((timer) => window.clearTimeout(timer));
      gsapAnimations.forEach((animation) => animation.kill());
      revealElements.forEach((element) => {
        if (element.dataset.revealAnimated === "true") {
          clearRevealAnimationProps(element);
        }
      });
      gsapMedia?.revert();
      document.querySelectorAll(".tap-ripple, .button-ripple, .gsap-burst-dot").forEach((ripple) => ripple.remove());
      document.body.classList.remove("site-nav-open");
      tiltCleanups.forEach((cleanup) => cleanup());
      magnetCleanups.forEach((cleanup) => cleanup());
      navCleanups.forEach((cleanup) => cleanup());
    };
  }, [renderAmbient]);

  return (
    <>
      {renderAmbient ? (
        <>
          <canvas ref={canvasRef} className="background-canvas" aria-hidden="true" />
          <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
          <div className="ambient-orbits" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="data-streams" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="depth-constellation" aria-hidden="true">
            <span className="depth-cube depth-cube--one" />
            <span className="depth-cube depth-cube--two" />
            <span className="depth-cube depth-cube--three" />
            <span className="depth-cube depth-cube--four" />
            <span className="depth-cube depth-cube--five" />
            <span className="depth-cube depth-cube--six" />
          </div>
          <div className="decor-3d-atmosphere" aria-hidden="true">
            <span className="decor-3d-torus torus-one" />
            <span className="decor-3d-torus torus-two" />
            <span className="decor-3d-torus torus-three" />
            <span className="decor-3d-torus torus-four" />
            <span className="decor-3d-torus torus-five" />
            <span className="decor-3d-diamond diamond-one" />
            <span className="decor-3d-diamond diamond-two" />
            <span className="decor-3d-diamond diamond-three" />
            <span className="decor-3d-diamond diamond-four" />
            <span className="decor-3d-diamond diamond-five" />
            <span className="decor-3d-panel panel-one" />
            <span className="decor-3d-panel panel-two" />
            <span className="decor-3d-panel panel-three" />
            <span className="decor-3d-panel panel-four" />
            <span className="decor-3d-panel panel-five" />
            <span className="decor-3d-orb orb-one" />
            <span className="decor-3d-orb orb-two" />
            <span className="decor-3d-orb orb-three" />
            <span className="decor-3d-orb orb-four" />
            <span className="decor-3d-orb orb-five" />
          </div>
          <div className="gsap-animation-lab" aria-hidden="true">
            <span className="gsap-drone drone-alpha" />
            <span className="gsap-drone drone-beta" />
            <span className="gsap-drone drone-gamma" />
            <span className="gsap-drone drone-delta" />
            <span className="gsap-drone drone-epsilon" />
            <span className="gsap-axis axis-alpha" />
            <span className="gsap-axis axis-beta" />
            <span className="gsap-axis axis-gamma" />
            <span className="gsap-helix helix-alpha">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
            <span className="gsap-helix helix-beta">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          </div>
        </>
      ) : null}
      <div className="progress-line" aria-hidden="true" />
    </>
  );
}
