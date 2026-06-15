"use client";

import { useEffect, useRef } from "react";

type PointerState = {
  targetX: number;
  targetY: number;
  x: number;
  y: number;
};

export function InteractiveShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer: PointerState = {
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    let animationFrame = 0;
    let canvasFrame = 0;

    const floatingElements = [...document.querySelectorAll<HTMLElement>("[data-float]")];
    const tiltElements = [...document.querySelectorAll<HTMLElement>("[data-tilt]")];
    const revealElements = [...document.querySelectorAll<HTMLElement>(".reveal")];
    const magnets = [...document.querySelectorAll<HTMLElement>(".magnet")];
    const navToggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
    const siteNav = document.querySelector<HTMLElement>(".site-nav");
    const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".site-nav a")];
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d") || null;

    const updatePointerTarget = (clientX: number, clientY: number) => {
      pointer.targetX = clientX;
      pointer.targetY = clientY;
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

    const applyFloatingTransforms = (normalizedX: number, normalizedY: number) => {
      const positionScale = window.innerWidth < 640 ? 0.72 : window.innerWidth < 820 ? 0.86 : 1;
      const depthScale = window.innerWidth < 640 ? 0.88 : 1;

      floatingElements.forEach((element) => {
        const isInfoPanel = element.classList.contains("float-panel");
        const baseX = Number(element.dataset.x || 0) * positionScale;
        const baseY = Number(element.dataset.y || 0) * positionScale;
        const baseZ = Number(element.dataset.z || 0) * depthScale;
        const depth = Number(element.dataset.depth || 0);
        const baseRotateX = Number(element.dataset.rx || 0);
        const baseRotateY = Number(element.dataset.ry || 0);
        const baseRotateZ = Number(element.dataset.rz || 0);
        const moveScale = isInfoPanel ? 0.26 : 1;
        const rotateScale = isInfoPanel ? 0 : 1;
        const moveX = normalizedX * depth * 180 * moveScale;
        const moveY = normalizedY * depth * 140 * moveScale;
        const rotateY = baseRotateY + normalizedX * depth * 40 * rotateScale;
        const rotateX = baseRotateX + normalizedY * depth * -34 * rotateScale;
        const rotateZ = baseRotateZ + normalizedX * depth * -8 * rotateScale;

        element.style.transform = `translate3d(calc(-50% + ${baseX + moveX}px), calc(-50% + ${baseY + moveY}px), ${baseZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
      });
    };

    const renderFloatingScene = () => {
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;

      const normalizedX = window.innerWidth ? (pointer.x / window.innerWidth - 0.5) * 2 : 0;
      const normalizedY = window.innerHeight ? (pointer.y / window.innerHeight - 0.5) * 2 : 0;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${pointer.x - 208}px, ${pointer.y - 208}px, 0)`;
      }

      document.querySelectorAll<HTMLElement>(".scene-frame").forEach((frame) => {
        if (!prefersReducedMotion) {
          const frameRotateX = window.innerWidth < 640 ? normalizedY * -1.2 : normalizedY * -2.2;
          const frameRotateY = window.innerWidth < 640 ? normalizedX * 1.6 : normalizedX * 3.2;
          frame.style.transform = `perspective(1600px) rotateX(${frameRotateX}deg) rotateY(${frameRotateY}deg)`;
        }
      });

      applyFloatingTransforms(normalizedX, normalizedY);
      animationFrame = window.requestAnimationFrame(renderFloatingScene);
    };

    const tiltCleanups = tiltElements.map((element) => {
      const resetTilt = () => {
        element.style.transform = "";
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (prefersReducedMotion) {
          return;
        }

        const bounds = element.getBoundingClientRect();
        const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

        element.style.transform = `perspective(900px) rotateX(${offsetY * -10}deg) rotateY(${offsetX * 10}deg) translateY(-4px)`;
      };

      element.addEventListener("pointermove", handlePointerMove);
      element.addEventListener("pointerleave", resetTilt);
      element.addEventListener("pointercancel", resetTilt);

      return () => {
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("pointerleave", resetTilt);
        element.removeEventListener("pointercancel", resetTilt);
      };
    });

    const magnetCleanups = magnets.map((element) => {
      const resetMagnet = () => {
        element.style.transform = "";
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (prefersReducedMotion) {
          return;
        }

        const bounds = element.getBoundingClientRect();
        const x = event.clientX - bounds.left - bounds.width / 2;
        const y = event.clientY - bounds.top - bounds.height / 2;

        element.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
      };

      element.addEventListener("pointermove", handlePointerMove);
      element.addEventListener("pointerleave", resetMagnet);
      element.addEventListener("pointercancel", resetMagnet);

      return () => {
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("pointerleave", resetMagnet);
        element.removeEventListener("pointercancel", resetMagnet);
      };
    });

    const navCleanups: Array<() => void> = [];

    if (navToggle && siteNav) {
      const handleToggle = () => {
        const expanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!expanded));
        siteNav.classList.toggle("is-open", !expanded);
      };
      const closeNav = () => {
        navToggle.setAttribute("aria-expanded", "false");
        siteNav.classList.remove("is-open");
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

    let width = 0;
    let height = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; depth: number }> = [];

    const createParticles = () => {
      const density = window.innerWidth < 640 ? 26 : 42;
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

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resizeCanvas);
    handleScroll();
    resizeCanvas();
    drawCanvas();

    if (prefersReducedMotion) {
      applyFloatingTransforms(0, 0);
    } else {
      animationFrame = window.requestAnimationFrame(renderFloatingScene);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resizeCanvas);
      window.cancelAnimationFrame(animationFrame);
      window.cancelAnimationFrame(canvasFrame);
      observer.disconnect();
      tiltCleanups.forEach((cleanup) => cleanup());
      magnetCleanups.forEach((cleanup) => cleanup());
      navCleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="background-canvas" aria-hidden="true" />
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <div className="progress-line" aria-hidden="true" />
    </>
  );
}
