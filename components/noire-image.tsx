"use client";
import {useEffect,useState} from "react";
type Props=React.ImgHTMLAttributes<HTMLImageElement>;
/** Graceful branded placeholder if a merchant's original image URL fails. */
export default function NoireImage({src,alt,...rest}:Props){const [bad,setBad]=useState(false);useEffect(()=>setBad(false),[src]);return <img {...rest} src={!bad&&src?src:"/brand/noire-image-fallback.svg"} alt={alt||"Fragrance image unavailable"} onError={()=>setBad(true)}/>;}
