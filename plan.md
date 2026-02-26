Act as a Senior Full-Stack Engineer and an Expert UI/UX Designer. I am building a "Medical AI Expert System" web application as a hobby project. 

The application has two core engines:
1. Google Gemini AI API: For generative text processing and multimodal image analysis (e.g., analyzing an uploaded medical scan/tumor, providing a simulated diagnosis, treatment plan, and preventive care).
2. CLIPS Expert System (https://www.clipsrules.net/): For strict rule-based medical logic and decision-making.

I need you to generate a complete, clean, and highly scalable project structure, along with the core code files. 

### UI/UX & Design Requirements:
- Visual Style: Heavy, beautiful, and tasteful "Glassmorphism" (Liquid Glass) effect using translucent backgrounds, subtle borders, and background blurs. 
- Color Palette: Professional, trustworthy medical colors (deep blues, clean whites, soft cyans/teals). DO NOT use exaggerated, over-the-top, or neon colors.
- Icons & Imagery: Use `lucide-react` for modern, clean icons. Automatically integrate high-quality placeholder image URLs (from Unsplash/Pexels) relevant to "Medical, AI, and Information Systems".
- Navigation Animation: Implement fluid, stretchy, spring-based animations for switching between categories/tabs (use `framer-motion` layoutId or similar for a buttery smooth transition).
- Charts: Integrate interactive charts (use `recharts` or similar). I need:
  1. A Gradient Area/Line Chart with a precise interactive pointer/tooltip that displays data when hovered.
  2. A clean Pie Chart.
- Responsiveness: The entire layout must be 100% mobile-responsive and look perfect on all screens.

### Technical Stack Requirement:
- Framework: Next.js (App Router preferred) + TypeScript.
- Styling: Tailwind CSS.
- Animations: Framer Motion.
- Charts: Recharts.
- Icons: Lucide-React.

### Functional Components Needed:
1. Dashboard Layout: Sidebar/Top navigation with the fluid tab switching.
2. AI Diagnostic Form (Text): Input fields for patient data/symptoms that will be sent to the CLIPS/Gemini engine.
3. Multimodal Image Analysis Scanner: A drag-and-drop zone for medical images (e.g., X-rays, tumors) that simulates sending the image to Gemini Vision API and displays the parsed output (Findings, Treatment, Preventive Care).
4. Analytics View: Displaying the Gradient and Pie charts seamlessly in glassmorphic cards.

### Your Task:
1. First, output a clean, logical File & Folder Structure for this Next.js project.
2. Provide the code for the main layout, the glassmorphic global CSS, and the fluid navigation component.
3. Provide the code for the "Image Scanner & AI Results" component, including simulated Gemini API integration logic.
4. Provide the code for the Charts component.
5. Ensure all code is modular, well-commented, strictly typed, and visually stunning right out of the box.

Do not write dummy text like "lorem ipsum"; use realistic medical AI placeholder text. Let's start!


## Additional tips for project success:

### Regarding CLIPS: Since CLIPS is written in C, the best way to integrate it with a website is to use Python as the backend (e.g., using the FastAPI framework) and a library called clipspy to run the CLIPS code. Then, have Next.js communicate with this backend via the API.

### Regarding the Gemini API: When analyzing medical images, be sure to add a line in the API's prompt that instructs it to return the data in JSON format (e.g., {"tumor_type": "...", "treatment": "...", "prevention": "..."}). This will make it easier to display the data in a structured and segmented way in the interface, rather than as one long piece of text.


data :  
gemini api key : AIzaSyDFt_qdak6ljdBn1vq9U-5EIHOXmWdkQus

dont forget to create .env file and add the api key to it and not use any hardcode in the code 