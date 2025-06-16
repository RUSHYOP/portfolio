// Angular App
angular.module("portfolioApp", []).controller("MainController", [
  "$scope",
  "$timeout",
  "$window",
  function ($scope, $timeout, $window) {
    // Loading state
    $scope.loading = true;
    $scope.showNav = false;
    $scope.glitchEffect = false;

    const loadingTexts = [
      "Initializing Systems...",
      "Loading Backend Services...",
      "Connecting to Databases...",
      "Optimizing Performance...",
      "Almost ready...",
    ];

    let textIndex = 0;
    $scope.loadingText = loadingTexts[textIndex];

    const loadingInterval = setInterval(() => {
      textIndex = (textIndex + 1) % loadingTexts.length;
      $scope.loadingText = loadingTexts[textIndex];
      $scope.$apply();
    }, 800);

    // Hero data
    $scope.heroTitle = "PURAV S";
    $scope.heroSubtitle = "Backend Developer & System Architect";
    $scope.ctaText = "EXPLORE WORK";

    // About data
    $scope.about = {
      title: "Building Backend Systems",
      paragraphs: [
        "I'm a backend developer with experience in building server-side applications and working with databases. Currently pursuing B.E. in Computer Science with a CGPA of 8.44.",
        "My skills include API development, database management, and basic machine learning integration. I enjoy writing clean code and solving backend challenges.",
        "When I'm not coding, you can find me gaming, travelling, or just building something cool.",
      ],
    };

    $scope.skills = [
      "Python",
      "JavaScript",
      "C Language",
      "MySQL",
      "Git",
      "Flask",
      "Machine Learning",
      "AI/ML",
      "Cloud Computing",
      "DevOps",
      "Data Structures",
      "DBMS",
    ];

    // Projects data based on resume
    $scope.projects = [
      {
        title: "PulseAI: Heart Health Monitor",
        description:
          "Developing a machine learning-powered smartwatch prototype for heart health monitoring with GSM alerts, real-time cloud sync, and anomaly detection algorithms.",
        icon: "💓",
        technologies: ["Python", "Machine Learning", "IoT", "Cloud Sync"],
      },
      {
        title: "ProcSAGE - Host Threat Detection",
        description:
          "Python-based ML model to detect anomalies in system calls for enhanced endpoint security. Published at IEEE ESCI 2025 conference.",
        icon: "🔒",
        technologies: ["Python", "Machine Learning", "Cybersecurity"],
        liveLink: "https://ieeexplore.ieee.org/document/10988235",
        codeLink: "https://github.com/RUSHYOP/Procsage", // Add your GitHub link here
      },
      {
        title: "FinAI - NLP Financial Chatbot",
        description:
          "Built a finance-focused chatbot for Google Dev Solution Challenge using Python and Flask Framework. Provides market-based recommendations with legal insights.",
        icon: "💰",
        technologies: ["Python", "Flask", "NLP", "Google Cloud"],
        codeLink: "https://github.com/RUSHYOP/FinAI", // Add your GitHub link here
      },
      {
        title: "PigGame Backend System",
        description:
          "Developed the backend for a two-player dice-based game using JavaScript. Implemented Fisher-Yates shuffle algorithm for fair and human-like dice rolls.",
        icon: "🎲",
        technologies: ["JavaScript", "Game Logic", "Algorithms", "Backend"],
        liveLink: "https://pig-game-lovat-eight.vercel.app/", // Add your live site link here
        codeLink: "https://github.com/RUSHYOP/pig-game", // Add your GitHub link here
      },
      {
        title: "Disease Prediction AI System",
        description:
          "Built an AI chatbot using Python and Gradio to assess risks of Parkinson's disease using symptom inputs. Focused on early diagnosis support.",
        icon: "🏥",
        technologies: ["Python", "Gradio", "AI/ML"],
        liveLink: "https://huggingface.co/spaces/Rushyy/parkinsons", // Add your live site link here
        codeLink: "https://github.com/RUSHYOP/Parkinson-s-predictor", // Add your GitHub link here
      },
    ];

    // Form data
    $scope.form = {
      name: "",
      email: "",
      subject: "",
      message: "",
    };

    // Methods
    $scope.exploreWork = function () {
      $scope.scrollTo("about");
    };

    $scope.scrollTo = function (elementId) {
      const element = document.getElementById(elementId);
      const navHeight = 80;
      const targetPosition = element.offsetTop - navHeight;

      $window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });

      // Update active nav
      document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
      });
      document.querySelector(`[href="#${elementId}"]`).classList.add("active");
    };

    $scope.submitForm = function () {
      if (
        $scope.form.name &&
        $scope.form.email &&
        $scope.form.subject &&
        $scope.form.message
      ) {
        // Show loading state
        $scope.isSubmitting = true;

        // EmailJS integration
        emailjs
          .send("service_6tjprnp", "template_xer91le", {
            from_name: $scope.form.name,
            from_email: $scope.form.email,
            subject: $scope.form.subject,
            message: $scope.form.message,
            to_email: "alwayspurav@gmail.com",
          })
          .then(function (response) {
            console.log("SUCCESS!", response.status, response.text);
            alert(
              `Thank you, ${$scope.form.name}! Your message has been sent successfully. I'll get back to you soon!`
            );

            // Reset form
            $scope.form = {
              name: "",
              email: "",
              subject: "",
              message: "",
            };
            $scope.isSubmitting = false;
            $scope.$apply();
          })
          .catch(function (error) {
            console.log("FAILED...", error);
            alert(
              "Sorry, there was an error sending your message. Please try again or email me directly at alwayspurav@gmail.com"
            );
            $scope.isSubmitting = false;
            $scope.$apply();
          });
      }
    };

    // Initialize app after loading
    $timeout(() => {
      clearInterval(loadingInterval);
      $scope.loading = false;

      $timeout(() => {
        $scope.showNav = true;
        initializeEffects();
        setupScrollAnimations();
        setupCursor();
        setupThreeJS();
      }, 1000);

      // Periodic glitch effect
      setInterval(() => {
        $scope.glitchEffect = true;
        $scope.$apply();
        $timeout(() => {
          $scope.glitchEffect = false;
        }, 200);
      }, 10000);
    }, 4000);

    // Initialize effects
    function initializeEffects() {
      // Parallax effect
      $window.addEventListener("mousemove", (e) => {
        const x = (e.clientX / $window.innerWidth) * 100;
        const y = (e.clientY / $window.innerHeight) * 100;

        document.querySelectorAll(".floating").forEach((el) => {
          const speed = el.dataset.speed || 0.5;
          el.style.transform = `translate(${(x - 50) * speed * 0.01}px, ${
            (y - 50) * speed * 0.01
          }px)`;
        });
      });

      // Advanced hover effects
      document
        .querySelectorAll(".project-card, .skill-item")
        .forEach((card) => {
          card.addEventListener("mousemove", function (e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
          });

          card.addEventListener("mouseleave", function () {
            this.style.transform = "";
          });
        });
    }

    // Scroll animations
    function setupScrollAnimations() {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: "0px 0px -100px 0px",
        }
      );

      document.querySelectorAll(".section").forEach((section) => {
        observer.observe(section);
      });

      // Navbar scroll effect
      $window.addEventListener("scroll", () => {
        const scrolled = $window.pageYOffset;
        const rate = scrolled * -0.5;

        // Parallax background
        const hero = document.getElementById("hero");
        if (hero) {
          hero.style.transform = `translateY(${rate}px)`;
        }
      });
    }

    // Custom cursor
    function setupCursor() {
      const cursor = document.getElementById("cursor");

      let mouseX = 0,
        mouseY = 0;

      document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        cursor.style.left = mouseX - 4 + "px";
        cursor.style.top = mouseY - 4 + "px";
      });

      // Cursor interactions
      document
        .querySelectorAll("button, a, .project-card, .skill-item")
        .forEach((el) => {
          el.addEventListener("mouseenter", () => {
            cursor.style.transform = "scale(2)";
          });

          el.addEventListener("mouseleave", () => {
            cursor.style.transform = "scale(1)";
          });
        });
    }

    // Three.js background - particles only
    function setupThreeJS() {
      const canvas = document.getElementById("canvas-bg");
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Create particles only
      const particlesGeometry = new THREE.BufferGeometry();
      const particlesCount = 1000;
      const posArray = new Float32Array(particlesCount * 3);

      for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 50;
      }

      particlesGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(posArray, 3)
      );

      const particlesMaterial = new THREE.PointsMaterial({
        size: 0.005,
        color: "#ffffff",
        transparent: true,
        opacity: 0.8,
      });

      const particlesMesh = new THREE.Points(
        particlesGeometry,
        particlesMaterial
      );
      scene.add(particlesMesh);

      camera.position.z = 5;

      // Mouse interaction
      let mouseXThree = 0,
        mouseYThree = 0;
      document.addEventListener("mousemove", (e) => {
        mouseXThree = (e.clientX / window.innerWidth) * 2 - 1;
        mouseYThree = -(e.clientY / window.innerHeight) * 2 + 1;
      });

      // Animation loop
      function animate() {
        requestAnimationFrame(animate);

        // Rotate particles
        particlesMesh.rotation.x += 0.001;
        particlesMesh.rotation.y += 0.001;

        // Camera movement based on mouse
        camera.position.x += (mouseXThree * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (mouseYThree * 0.5 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
      }

      animate();

      // Handle resize
      window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }
  },
]);

// Prevent context menu
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Add some keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});
