# Build
FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# Run
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
RUN adduser -D -H -u 65532 app
WORKDIR /app
COPY --from=build /out/server ./server
COPY migrations ./migrations
USER 65532:65532
EXPOSE 8080
ENV HTTP_ADDR=:8080
ENV MIGRATIONS_PATH=file:///app/migrations
CMD ["./server"]
