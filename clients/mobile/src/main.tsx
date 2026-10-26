import { createRoot } from "react-dom/client";
import { SharedApplication } from "@/components/shared/application";
import artwork from "../../../public/icons/luo-heritage-512.png";
import * as api from "./api";
import "./styles.css";
createRoot(document.getElementById("root")!).render(<SharedApplication adapters={{ ...api, artwork }} />);
