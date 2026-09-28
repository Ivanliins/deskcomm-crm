import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/** A mesma curva de massa e mola usada nas transições CSS da landing (B7). */
export const EASE_FLUIDO = "fluido";

let registrado = false;

export function registrarGsap(): void {
  if (registrado) return;
  gsap.registerPlugin(CustomEase, DrawSVGPlugin, ScrambleTextPlugin, ScrollTrigger, SplitText);
  CustomEase.create(EASE_FLUIDO, "0.32,0.72,0,1");
  registrado = true;
}

export { gsap, ScrollTrigger, SplitText };
