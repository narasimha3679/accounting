package httpx

import (
	"encoding/json"
	"net/http"
)

type Problem struct {
	Type   string `json:"type,omitempty"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail,omitempty"`
	Code   string `json:"code,omitempty"`
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func ProblemJSON(w http.ResponseWriter, status int, title, detail, code string) {
	p := Problem{
		Type:   "about:blank",
		Title:  title,
		Status: status,
		Detail: detail,
		Code:   code,
	}
	WriteJSON(w, status, p)
}
