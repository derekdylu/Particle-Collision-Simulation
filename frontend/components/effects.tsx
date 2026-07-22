'use client'

import { useEffect, useRef } from 'react';

const ParticleCollision = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Utility
    const distance = (x1: number, y1: number, x2: number, y2: number) =>
      Math.hypot(x2 - x1, y2 - y1);

    type Velocity = { x: number; y: number };

    class Particle {
      x: number;
      y: number;
      radius: number;
      color: string;
      velocity: Velocity;

      constructor(x: number, y: number, radius: number, color: string) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
        };
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
      }

      update(particles: Particle[]) {
        if (!ctx || !canvas) return;
        // Walls
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
          this.velocity.x *= -1;
        }
        if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
          this.velocity.y *= -1;
        }

        // Collisions
        for (const other of particles) {
          if (this === other) continue;
          const dist = distance(this.x, this.y, other.x, other.y);
          if (dist < this.radius + other.radius) {
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const angle = Math.atan2(dy, dx);

            // Rotate function
            const rotate = (vel: Velocity, ang: number) => ({
              x: vel.x * Math.cos(ang) - vel.y * Math.sin(ang),
              y: vel.x * Math.sin(ang) + vel.y * Math.cos(ang),
            });

            const u1 = rotate(this.velocity, angle);
            const u2 = rotate(other.velocity, angle);

            const v1 = { x: u2.x, y: u1.y };
            const v2 = { x: u1.x, y: u2.y };

            const vFinal1 = rotate(v1, -angle);
            const vFinal2 = rotate(v2, -angle);

            this.velocity.x = vFinal1.x;
            this.velocity.y = vFinal1.y;
            other.velocity.x = vFinal2.x;
            other.velocity.y = vFinal2.y;
          }
        }

        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.draw();
      }
    }

    const particles: Particle[] = [];
    const colors = ['#FF3CAC', '#784BA0', '#2B86C5', '#F7B267', '#F79F79'];
    const numParticles = 50;
    const radius = 10;

    // Initialize
    for (let i = 0; i < numParticles; i++) {
      let x = Math.random() * (canvas.width - radius * 2) + radius;
      let y = Math.random() * (canvas.height - radius * 2) + radius;

      // Avoid overlap
      for (let j = 0; j < particles.length; j++) {
        if (distance(x, y, particles[j].x, particles[j].y) < radius * 2) {
          x = Math.random() * (canvas.width - radius * 2) + radius;
          y = Math.random() * (canvas.height - radius * 2) + radius;
          j = -1;
        }
      }
      particles.push(new Particle(x, y, radius, colors[Math.floor(Math.random() * colors.length)]));
    }

    // Animate
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => p.update(particles));
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
      }}
    />
  );
};

export { ParticleCollision };
