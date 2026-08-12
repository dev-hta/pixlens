import landscape from "../assets/sample-landscape.jpg";
import portrait from "../assets/sample-portrait.jpg";
import lowlight from "../assets/sample-lowlight.jpg";

export interface Sample {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  src: string;
}

/** Built-in demo scenes — each showcases a different part of the pipeline. */
export const SAMPLES: Sample[] = [
  {
    id: "landscape",
    title: "Golden Hour Valley",
    subtitle: "High dynamic range",
    tag: "Tone mapping",
    src: landscape,
  },
  {
    id: "portrait",
    title: "Window-Light Portrait",
    subtitle: "Skin tones",
    tag: "Color science",
    src: portrait,
  },
  {
    id: "lowlight",
    title: "Neon Night Street",
    subtitle: "Low light + grain",
    tag: "Denoise",
    src: lowlight,
  },
];
