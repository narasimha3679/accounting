package storage

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type B2 struct {
	client *s3.Client
	bucket string
}

func NewB2(ctx context.Context, endpoint, region, bucket, keyID, appKey string) (*B2, error) {
	if endpoint == "" || bucket == "" || keyID == "" || appKey == "" {
		return nil, fmt.Errorf("B2_S3_ENDPOINT, B2_BUCKET, B2_KEY_ID, B2_APPLICATION_KEY are required for storage")
	}
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(keyID, appKey, "")),
	)
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})
	return &B2{client: client, bucket: bucket}, nil
}

func (b *B2) PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error) {
	ps := s3.NewPresignClient(b.client)
	out, err := ps.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(b.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", err
	}
	return out.URL, nil
}

func (b *B2) PresignPut(ctx context.Context, key, contentType string, ttl time.Duration) (string, error) {
	ps := s3.NewPresignClient(b.client)
	in := &s3.PutObjectInput{
		Bucket: aws.String(b.bucket),
		Key:    aws.String(key),
	}
	if contentType != "" {
		in.ContentType = aws.String(contentType)
	}
	out, err := ps.PresignPutObject(ctx, in, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", err
	}
	return out.URL, nil
}

func (b *B2) Put(ctx context.Context, key string, body io.Reader, contentType string, size int64) error {
	in := &s3.PutObjectInput{
		Bucket:      aws.String(b.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	}
	if size >= 0 {
		in.ContentLength = aws.Int64(size)
	}
	_, err := b.client.PutObject(ctx, in)
	return err
}

func (b *B2) Delete(ctx context.Context, key string) error {
	_, err := b.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(b.bucket),
		Key:    aws.String(key),
	})
	return err
}
