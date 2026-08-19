 export default function HeroBackground() {
    return (
      <>
        <div
          className="hero-beam"
          style={{
            position: "absolute",
            top: "-320px",
            left: "50%",
            width: "760px",
            height: "900px",
            zIndex: "0",
            background: "linear-gradient(180deg, rgba(59,130,246,0.20) 0%, rgba(59,130,246,0) 72%)",
            filter: "blur(50px)",
            transform: "translateX(-50%) rotate(-6deg)",
            animation: "beamSway 16s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          className="aurora"
          style={{
            position: "absolute",
            top: "-180px",
            left: "8%",
            width: "560px",
            height: "520px",
            zIndex: "0",
            background: "radial-gradient(circle at 50% 50%, rgba(126,212,169,0.55) 0%, rgba(126,212,169,0) 68%)",
            filter: "blur(70px)",
            animation: "auroraA 22s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          className="aurora"
          style={{
            position: "absolute",
            top: "-120px",
            right: "4%",
            width: "520px",
            height: "480px",
            zIndex: "0",
            background: "radial-gradient(circle at 50% 50%, rgba(22,35,74,0.30) 0%, rgba(22,35,74,0) 68%)",
            filter: "blur(80px)",
            animation: "auroraB 26s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "0",
            zIndex: "0",
            opacity: "0.05",
            pointerEvents: "none",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </>
    );
  }