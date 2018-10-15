S3 Bucket:

https://s3.console.aws.amazon.com/s3/buckets/alexa-storyteller/?region=us-east-1&tab=permissions

To convert an audio file to Alexa SSML compatible format:
* Install ffmpeg.
* ffmpeg -i input-file -ac 2 -codec:a libmp3lame -b:a 48k -ar 16000 output-file.mp3
* ffmpeg -t 88 -i inputfile.mp3 -acodec copy outputfile.mp3
