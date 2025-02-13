FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest

RUN apk add --no-cache ffmpeg python3

WORKDIR /app

COPY --from=builder /app/main .

RUN chmod +x /app/main

EXPOSE 80

CMD ["./main"]