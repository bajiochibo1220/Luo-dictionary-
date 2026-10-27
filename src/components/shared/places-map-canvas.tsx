"use client";
import { MapContainer,TileLayer,CircleMarker,Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
export type Place={id:string;title:string;module:string;latitude:number;longitude:number};
export function PlacesMapCanvas({places}:{places:Place[]}){const first=places[0];return <MapContainer key={first?.id||"empty"} center={first?[first.latitude,first.longitude]:[-.4,34.5]} zoom={8} scrollWheelZoom={false} className="h-80 w-full rounded-xl"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{places.map(place=><CircleMarker key={place.id} center={[place.latitude,place.longitude]} radius={8} pathOptions={{color:"#6b4724"}}><Popup><strong>{place.title}</strong><p>{place.module}</p></Popup></CircleMarker>)}</MapContainer>;}
