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
            background: "linear-gradient(180deg, rgba(242,140,56,0.20) 0%, rgba(242,140,56,0) 72%)",
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
            background: "radial-gradient(circle at 50% 50%, rgba(14,58,52,0.30) 0%, rgba(14,58,52,0) 68%)",
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
        <div
          style={{
            position: "absolute",
            inset: "0",
            zIndex: "0",
            backgroundImage:
              "linear-gradient(#DCE6E2 1px, transparent 1px), linear-gradient(90deg, #DCE6E2 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            opacity: "0.5",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, #000 0%, transparent 75%)",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, #000 0%, transparent 75%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-140px",
            left: "50%",
            width: "620px",
            height: "620px",
            marginLeft: "-310px",
            border: `1px solid #CFDEDA`,
            borderRadius: "50%",
            opacity: "0.55",
            zIndex: "0",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-60px",
            left: "50%",
            width: "420px",
            height: "420px",
            marginLeft: "-210px",
            border: `1px solid #CFDEDA`,
            borderRadius: "50%",
            opacity: "0.45",
            zIndex: "0",
          }}
        />
      </>
    );
  }